import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler.middleware';
import { uploadToS3, deleteFromS3, extractKeyFromUrl, getPresignedUrl } from '../utils/s3';
import {
  ListPhotosQuery,
  UploadPhotoInput,
  UpdatePhotoInput,
  ModeratePhotoInput,
} from '../schemas/photo.schema';

// ─── FIX: claves alineadas con plan_type real del schema ─────────
const PHOTO_LIMITS: Record<string, number> = {
  free:    20,
  one_time:     200,
  subscription: Infinity,
};

export class PhotoService {

  // ─── Helper: genera presigned URLs para una foto ──────────────
  private async withPresignedUrls(photo: any) {
    if (!photo) return photo;
    return {
      ...photo,
      url:           photo.url           ? await getPresignedUrl(extractKeyFromUrl(photo.url), 3600)           : photo.url,
      thumbnail_url: photo.thumbnail_url ? await getPresignedUrl(extractKeyFromUrl(photo.thumbnail_url), 3600) : photo.thumbnail_url,
    };
  }

  private async assertWeddingAccess(weddingId: string, userId: string) {
    const wedding = await prisma.wedding.findUnique({
      where:   { id: weddingId },
      include: { user_roles: { where: { user_id: userId }, take: 1 } },
    });
    if (!wedding) throw new AppError('Boda no encontrada', 404);
    const hasAccess = wedding.created_by === userId || wedding.user_roles.length > 0;
    if (!hasAccess) throw new AppError('No tienes acceso a esta boda', 403);
    return wedding;
  }

  private async assertPhotoAccess(photoId: string, userId: string) {
    const photo = await prisma.photo.findUnique({
      where:   { id: photoId },
      include: {
        wedding: { include: { user_roles: { where: { user_id: userId }, take: 1 } } },
      },
    });
    if (!photo) throw new AppError('Foto no encontrada', 404);
    const hasAccess = photo.wedding.created_by === userId || photo.wedding.user_roles.length > 0;
    if (!hasAccess) throw new AppError('No tienes acceso a esta foto', 403);
    return photo;
  }

  // ─── GET /api/weddings/:weddingId/photos ──────────────────────
  async getAll(weddingId: string, userId: string, filters: ListPhotosQuery) {
    const wedding = await this.assertWeddingAccess(weddingId, userId);
    const isOwner = wedding.created_by === userId;
    const isOwnerRole = wedding.user_roles.some((r: any) => r.role === 'owner');
    const where: any = {
      wedding_id: weddingId,
      deleted_at: null,  // FIX: excluir soft-deleted
    };

    if (isOwner || isOwnerRole) {
      // Owner ve todas, con filtro opcional por status
      if (filters.status) where.status = filters.status;
    } else {
      // Resto solo ven approved
      where.status = 'approved';
    }

    if (filters.uploaded_by_me) where.uploaded_by = userId;

    const [photos, total] = await Promise.all([
      prisma.photo.findMany({
        where,
        select: {
          id: true, url: true, thumbnail_url: true,
          caption: true, status: true, file_size: true, created_at: true,
          uploader: { select: { id: true, first_name: true, last_name: true, avatar_url: true } },
          approver: { select: { id: true, first_name: true, last_name: true } },
        },
        orderBy: { created_at: 'desc' },
        skip:  (filters.page - 1) * filters.limit,
        take:  filters.limit,
      }),
      prisma.photo.count({ where }),
    ]);

    // FIX: generar presigned URLs para cada foto
    const photosWithUrls = await Promise.all(photos.map(p => this.withPresignedUrls(p)));

    return {
      photos: photosWithUrls,
      is_owner: isOwner || isOwnerRole,
      pagination: {
        total,
        page:        filters.page,
        limit:       filters.limit,
        total_pages: Math.ceil(total / filters.limit),
        has_next:    filters.page * filters.limit < total,
      },
    };
  }

  // ─── GET /api/photos/:photoId ─────────────────────────────────
  async getById(photoId: string, userId: string) {
    await this.assertPhotoAccess(photoId, userId);
    const photo = await prisma.photo.findUnique({
      where:   { id: photoId },
      include: {
        uploader: { select: { id: true, first_name: true, last_name: true, avatar_url: true } },
        approver: { select: { id: true, first_name: true, last_name: true } },
      },
    });
    return this.withPresignedUrls(photo);
  }

  // ─── POST /api/weddings/:weddingId/photos ─────────────────────
  async upload(weddingId: string, userId: string, file: Express.Multer.File, data: UploadPhotoInput) {
    const wedding = await this.assertWeddingAccess(weddingId, userId);

    const activePlan = await this.getActivePlan(userId);
    const photoLimit = PHOTO_LIMITS[activePlan] ?? 20;

    if (photoLimit !== Infinity) {
      // FIX: contar solo fotos no eliminadas
      const currentCount = await prisma.photo.count({
        where: { wedding_id: weddingId, deleted_at: null },
      });
      if (currentCount >= photoLimit) {
        throw new AppError(
          `Has alcanzado el límite de ${photoLimit} fotos para el plan ${activePlan}. Actualiza tu plan para subir más.`,
          403,
        );
      }
    }

    const s3Result = await uploadToS3(file.buffer, file.mimetype, weddingId);

    const photo = await prisma.photo.create({
      data: {
        wedding_id:    weddingId,
        uploaded_by:   userId,
        url:           s3Result.url,
        thumbnail_url: s3Result.thumbnail_url,
        file_size:     s3Result.file_size,
        mime_type:     s3Result.mime_type,
        caption:       data.caption,
        status:        'pending',
      },
      include: {
        uploader: { select: { id: true, first_name: true, last_name: true } },
      },
    });

    return this.withPresignedUrls(photo);
  }

  // ─── POST /api/weddings/:weddingId/photos/batch ───────────────
  async uploadBatch(weddingId: string, userId: string, files: Express.Multer.File[]) {
    const wedding = await this.assertWeddingAccess(weddingId, userId);

    const activePlan = await this.getActivePlan(userId);
    const photoLimit   = PHOTO_LIMITS[activePlan] ?? 20;

    if (photoLimit !== Infinity) {
      const currentCount = await prisma.photo.count({
        where: { wedding_id: weddingId, deleted_at: null },
      });
      if (currentCount + files.length > photoLimit) {
        const remaining = photoLimit - currentCount;
        throw new AppError(
          `Solo puedes subir ${remaining} foto(s) más (límite: ${photoLimit}, actuales: ${currentCount}). Actualiza tu plan para subir más.`,
          403,
        );
      }
    }

    const uploadResults = await Promise.allSettled(
      files.map(f => uploadToS3(f.buffer, f.mimetype, weddingId)),
    );

    const successful = uploadResults
      .map((r, i) => ({ result: r, file: files[i] }))
      .filter(({ result }) => result.status === 'fulfilled') as Array<{
        result: PromiseFulfilledResult<Awaited<ReturnType<typeof uploadToS3>>>;
        file: Express.Multer.File;
      }>;

    const failed = uploadResults.filter(r => r.status === 'rejected').length;

    if (successful.length === 0) throw new AppError('No se pudo subir ninguna foto a S3', 500);

    await prisma.photo.createMany({
      data: successful.map(({ result }) => ({
        wedding_id:    weddingId,
        uploaded_by:   userId,
        url:           result.value.url,
        thumbnail_url: result.value.thumbnail_url,
        file_size:     result.value.file_size,
        mime_type:     result.value.mime_type,
        status:        'pending' as const,
      })),
    });

    return {
      uploaded: successful.length,
      failed,
      message: `${successful.length} foto(s) subidas correctamente${failed > 0 ? `, ${failed} fallaron` : ''}. Pendientes de moderación.`,
    };
  }

  // ─── PATCH /api/photos/:photoId ───────────────────────────────
  async update(photoId: string, userId: string, data: UpdatePhotoInput) {
    const photo = await this.assertPhotoAccess(photoId, userId);
    if (photo.uploaded_by !== userId) throw new AppError('Solo quien subió la foto puede editarla', 403);

    return prisma.photo.update({
      where:  { id: photoId },
      data:   { caption: data.caption },
      select: { id: true, caption: true, url: true, thumbnail_url: true, status: true },
    });
  }

  // ─── PATCH /api/photos/:photoId/moderate ─────────────────────
  async moderate(photoId: string, userId: string, data: ModeratePhotoInput) {
    const photo = await this.assertPhotoAccess(photoId, userId);

    const wedding = await prisma.wedding.findUnique({
      where:   { id: photo.wedding_id },
      include: { user_roles: { where: { user_id: userId } } },
    });

    // FIX: solo owner puede moderar (no planner)
    const isOwner     = wedding!.created_by === userId;
    const isOwnerRole = wedding!.user_roles.some((r: any) => r.role === 'owner');

    if (!isOwner && !isOwnerRole) {
      throw new AppError('Solo el organizador (owner) puede moderar fotos', 403);
    }

    return prisma.photo.update({
      where:  { id: photoId },
      data:   {
        status:      data.status,
        approved_by: data.status === 'approved' ? userId : null,
      },
      select: { id: true, status: true, approved_by: true, url: true, thumbnail_url: true },
    });
  }

  // ─── DELETE /api/photos/:photoId — FIX: soft delete real ─────
  async remove(photoId: string, userId: string) {
    const photo = await this.assertPhotoAccess(photoId, userId);

    const wedding = await prisma.wedding.findUnique({
      where:   { id: photo.wedding_id },
      include: { user_roles: { where: { user_id: userId } } },
    });

    const isOwner     = wedding!.created_by === userId;
    const isOwnerRole = wedding!.user_roles.some((r: any) => r.role === 'owner');
    const isUploader  = photo.uploaded_by === userId;

    if (!isOwner && !isOwnerRole && !isUploader) {
      throw new AppError('No tienes permisos para eliminar esta foto', 403);
    }

    // FIX: soft delete — marcar status=deleted y deleted_at, NO borrar de S3 ni de BD
    await prisma.photo.update({
      where: { id: photoId },
      data:  { status: 'deleted' as any, deleted_at: new Date() },
    });

    return { message: 'Foto eliminada correctamente' };
  }

  // ─── GET /api/weddings/:weddingId/photos/stats ────────────────
  async getStats(weddingId: string, userId: string) {
    await this.assertWeddingAccess(weddingId, userId);

    const wedding = await prisma.wedding.findUnique({
      where:  { id: weddingId },
      select: { plan_type: true },
    });

    const stats = await prisma.photo.groupBy({
      by:    ['status'],
      where: { wedding_id: weddingId, deleted_at: null },
      _count: { id: true },
      _sum:   { file_size: true },
    });

    const statusMap = stats.reduce<Record<string, { count: number; size: number }>>(
      (acc, s) => {
        acc[s.status] = { count: s._count.id, size: Number(s._sum.file_size ?? 0) };
        return acc;
      }, {},
    );

    const limit        = PHOTO_LIMITS[wedding!.plan_type] ?? 20;
    const total        = (statusMap['pending']?.count ?? 0) + (statusMap['approved']?.count ?? 0) + (statusMap['rejected']?.count ?? 0);
    const totalSize    = Object.values(statusMap).reduce((sum, s) => sum + s.size, 0);

    return {
      total,
      limit:            limit === Infinity ? null : limit,
      remaining:        limit === Infinity ? null : Math.max(0, limit - total),
      usage_percent:    limit === Infinity ? 0    : Math.round((total / limit) * 100),
      total_size_bytes: totalSize,
      total_size_mb:    Math.round(totalSize / 1024 / 1024 * 10) / 10,
      plan:             wedding!.plan_type,
      by_status: {
        pending:  statusMap['pending']?.count  ?? 0,
        approved: statusMap['approved']?.count ?? 0,
        rejected: statusMap['rejected']?.count ?? 0,
        deleted:  statusMap['deleted']?.count  ?? 0,
      },
    };
  }

  private async getActivePlan(userId: string): Promise<string> {
    const activeSub = await prisma.subscription.findFirst({
      where: { user_id: userId, status: { in: ['active', 'trialing'] } },
    });
    if (activeSub) return 'subscription';

    const oneTimeWedding = await prisma.wedding.findFirst({
      where: {
        created_by: userId,
        plan_type: 'one_time',
        payments: { some: { status: 'completed' } },
      },
    });
    if (oneTimeWedding) return 'one_time';

    return 'free';
  }
}

export default new PhotoService();