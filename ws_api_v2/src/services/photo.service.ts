import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler.middleware';
import { uploadToS3, deleteFromS3, extractKeyFromUrl } from '../utils/s3';
import {
  ListPhotosQuery,
  UploadPhotoInput,
  UpdatePhotoInput,
  ModeratePhotoInput,
} from '../schemas/photo.schema';

// Límites de fotos por tipo de plan
const PHOTO_LIMITS: Record<string, number> = {
  free: 20,
  one_time: 80,
  subscription: 80,
};

export class PhotoService {
  // ─── Helpers privados ──────────────────────────────────────────

  private async assertWeddingAccess(weddingId: string, userId: string) {
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      include: { user_roles: { where: { user_id: userId }, take: 1 } },
    });

    if (!wedding) throw new AppError('Boda no encontrada', 404);

    const hasAccess = wedding.created_by === userId || wedding.user_roles.length > 0;
    if (!hasAccess) throw new AppError('No tienes acceso a esta boda', 403);

    return wedding;
  }

  private async assertPhotoAccess(photoId: string, userId: string) {
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: {
        wedding: {
          include: { user_roles: { where: { user_id: userId }, take: 1 } },
        },
      },
    });

    if (!photo) throw new AppError('Foto no encontrada', 404);

    const hasAccess =
      photo.wedding.created_by === userId || photo.wedding.user_roles.length > 0;
    if (!hasAccess) throw new AppError('No tienes acceso a esta foto', 403);

    return photo;
  }

  // ─── Endpoints ────────────────────────────────────────────────

  /**
   * GET /api/weddings/:weddingId/photos
   * Lista fotos con paginación y filtros.
   */
  async getAll(weddingId: string, userId: string, filters: ListPhotosQuery) {
    await this.assertWeddingAccess(weddingId, userId);

    const where = {
      wedding_id: weddingId,
      ...(filters.status && { status: filters.status }),
      ...(filters.uploaded_by_me && { uploaded_by: userId }),
    };

    const [photos, total] = await Promise.all([
      prisma.photo.findMany({
        where,
        select: {
          id: true,
          url: true,
          thumbnail_url: true,
          caption: true,
          status: true,
          file_size: true,
          created_at: true,
          uploader: {
            select: { id: true, first_name: true, last_name: true, avatar_url: true },
          },
          approver: {
            select: { id: true, first_name: true, last_name: true },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.photo.count({ where }),
    ]);

    return {
      photos,
      pagination: {
        total,
        page: filters.page,
        limit: filters.limit,
        total_pages: Math.ceil(total / filters.limit),
        has_next: filters.page * filters.limit < total,
      },
    };
  }

  /**
   * GET /api/photos/:photoId
   * Detalle de una foto.
   */
  async getById(photoId: string, userId: string) {
    await this.assertPhotoAccess(photoId, userId);

    return prisma.photo.findUnique({
      where: { id: photoId },
      include: {
        uploader: {
          select: { id: true, first_name: true, last_name: true, avatar_url: true },
        },
        approver: {
          select: { id: true, first_name: true, last_name: true },
        },
      },
    });
  }

  /**
   * POST /api/weddings/:weddingId/photos
   * Sube una foto individual a S3.
   */
  async upload(
    weddingId: string,
    userId: string,
    file: Express.Multer.File,
    data: UploadPhotoInput,
  ) {
    const wedding = await this.assertWeddingAccess(weddingId, userId);

    // Verificar límite de fotos según plan
    const photoLimit = PHOTO_LIMITS[wedding.plan_type] ?? 20;
    const currentCount = await prisma.photo.count({ where: { wedding_id: weddingId } });

    if (currentCount >= photoLimit) {
      throw new AppError(
        `Has alcanzado el límite de ${photoLimit} fotos para el plan ${wedding.plan_type}`,
        403,
      );
    }

    // Subir a S3 (optimiza y genera thumbnail automáticamente)
    const s3Result = await uploadToS3(file.buffer, file.mimetype, weddingId);

    // Guardar en BD
    const photo = await prisma.photo.create({
      data: {
        wedding_id: weddingId,
        uploaded_by: userId,
        url: s3Result.url,
        thumbnail_url: s3Result.thumbnail_url,
        file_size: s3Result.file_size,
        mime_type: s3Result.mime_type,
        caption: data.caption,
        status: 'pending', // requiere moderación
      },
      include: {
        uploader: {
          select: { id: true, first_name: true, last_name: true },
        },
      },
    });

    return photo;
  }

  /**
   * POST /api/weddings/:weddingId/photos/batch
   * Sube múltiples fotos a la vez (máx 10).
   */
  async uploadBatch(
    weddingId: string,
    userId: string,
    files: Express.Multer.File[],
  ) {
    const wedding = await this.assertWeddingAccess(weddingId, userId);

    // Verificar límite considerando las fotos nuevas
    const photoLimit = PHOTO_LIMITS[wedding.plan_type] ?? 20;
    const currentCount = await prisma.photo.count({ where: { wedding_id: weddingId } });

    if (currentCount + files.length > photoLimit) {
      const remaining = photoLimit - currentCount;
      throw new AppError(
        `Solo puedes subir ${remaining} foto(s) más (límite: ${photoLimit}, actuales: ${currentCount})`,
        403,
      );
    }

    // Subir todas a S3 en paralelo
    const uploadResults = await Promise.allSettled(
      files.map(f => uploadToS3(f.buffer, f.mimetype, weddingId)),
    );

    // Separar éxitos y fallos
    const successful = uploadResults
      .map((r, i) => ({ result: r, file: files[i] }))
      .filter(({ result }) => result.status === 'fulfilled') as Array<{
        result: PromiseFulfilledResult<Awaited<ReturnType<typeof uploadToS3>>>;
        file: Express.Multer.File;
      }>;

    const failed = uploadResults.filter(r => r.status === 'rejected').length;

    if (successful.length === 0) {
      throw new AppError('No se pudo subir ninguna foto a S3', 500);
    }

    // Insertar registros en BD
    await prisma.photo.createMany({
      data: successful.map(({ result }) => ({
        wedding_id: weddingId,
        uploaded_by: userId,
        url: result.value.url,
        thumbnail_url: result.value.thumbnail_url,
        file_size: result.value.file_size,
        mime_type: result.value.mime_type,
        status: 'pending' as const,
      })),
    });

    return {
      uploaded: successful.length,
      failed,
      message: `${successful.length} foto(s) subidas correctamente${failed > 0 ? `, ${failed} fallaron` : ''}`,
    };
  }

  /**
   * PATCH /api/photos/:photoId
   * Actualiza el caption de una foto.
   * Solo puede hacerlo quien la subió.
   */
  async update(photoId: string, userId: string, data: UpdatePhotoInput) {
    const photo = await this.assertPhotoAccess(photoId, userId);

    if (photo.uploaded_by !== userId) {
      throw new AppError('Solo quien subió la foto puede editarla', 403);
    }

    return prisma.photo.update({
      where: { id: photoId },
      data: { caption: data.caption },
      select: { id: true, caption: true, url: true, thumbnail_url: true, status: true },
    });
  }

  /**
   * PATCH /api/photos/:photoId/moderate
   * Aprueba o rechaza una foto.
   * Solo puede hacerlo el creador de la boda o un planner.
   */
  async moderate(photoId: string, userId: string, data: ModeratePhotoInput) {
    const photo = await this.assertPhotoAccess(photoId, userId);

    // Verificar que es creador o planner
    const wedding = await prisma.wedding.findUnique({
      where: { id: photo.wedding_id },
      include: { user_roles: { where: { user_id: userId } } },
    });

    const isCreator = wedding!.created_by === userId;
    const isPlanner = wedding!.user_roles.some(r => r.role === 'planner');

    if (!isCreator && !isPlanner) {
      throw new AppError('Solo el creador o planner pueden moderar fotos', 403);
    }

    return prisma.photo.update({
      where: { id: photoId },
      data: {
        status: data.status,
        approved_by: data.status === 'approved' ? userId : null,
      },
      select: {
        id: true,
        status: true,
        approved_by: true,
        url: true,
        thumbnail_url: true,
      },
    });
  }

  /**
   * DELETE /api/photos/:photoId
   * Soft delete en BD + eliminación real de S3.
   * El uploader o el creador/planner de la boda pueden borrar.
   */
  async remove(photoId: string, userId: string) {
    const photo = await this.assertPhotoAccess(photoId, userId);

    const wedding = await prisma.wedding.findUnique({
      where: { id: photo.wedding_id },
      include: { user_roles: { where: { user_id: userId } } },
    });

    const isCreator = wedding!.created_by === userId;
    const isPlanner = wedding!.user_roles.some(r => r.role === 'planner');
    const isUploader = photo.uploaded_by === userId;

    if (!isCreator && !isPlanner && !isUploader) {
      throw new AppError('No tienes permisos para eliminar esta foto', 403);
    }

    // 1. Soft delete en BD (el middleware pone deleted_at)
    await prisma.photo.delete({ where: { id: photoId } });

    // 2. Eliminar archivos de S3 en background (no bloquear la respuesta)
    const key = extractKeyFromUrl(photo.url);
    const thumbKey = photo.thumbnail_url ? extractKeyFromUrl(photo.thumbnail_url) : undefined;

    deleteFromS3(key, thumbKey).catch(err => {
      console.error(`[S3] Error al eliminar foto ${key}:`, err);
    });

    return { message: 'Foto eliminada correctamente' };
  }

  /**
   * GET /api/weddings/:weddingId/photos/stats
   * Estadísticas de fotos de la boda.
   */
  async getStats(weddingId: string, userId: string) {
    await this.assertWeddingAccess(weddingId, userId);

    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      select: { plan_type: true },
    });

    const stats = await prisma.photo.groupBy({
      by: ['status'],
      where: { wedding_id: weddingId },
      _count: { id: true },
      _sum: { file_size: true },
    });

    const statusMap = stats.reduce<Record<string, { count: number; size: number }>>(
      (acc, s) => {
        acc[s.status] = {
          count: s._count.id,
          size: s._sum.file_size ?? 0,
        };
        return acc;
      },
      {},
    );

    const total = Object.values(statusMap).reduce((sum, s) => sum + s.count, 0);
    const totalSize = Object.values(statusMap).reduce((sum, s) => sum + s.size, 0);
    const limit = PHOTO_LIMITS[wedding!.plan_type] ?? 20;

    return {
      total,
      limit,
      remaining: Math.max(0, limit - total),
      usage_percent: Math.round((total / limit) * 100),
      total_size_bytes: totalSize,
      total_size_mb: Math.round(totalSize / 1024 / 1024 * 10) / 10,
      by_status: {
        pending: statusMap['pending']?.count ?? 0,
        approved: statusMap['approved']?.count ?? 0,
        rejected: statusMap['rejected']?.count ?? 0,
      },
    };
  }
}

export default new PhotoService();