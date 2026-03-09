import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler.middleware';
import { uploadToS3, deleteFromS3, extractKeyFromUrl } from '../utils/s3';

export class UserService {

  /**
   * Sube la foto de perfil a S3 y actualiza avatar_url en la DB.
   * Si el usuario ya tenía avatar, borra el anterior de S3.
   */
  async updateAvatar(userId: string, file: Express.Multer.File) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, avatar_url: true },
    });

    if (!user) throw new AppError('Usuario no encontrado', 404);

    // Subir nueva imagen a S3 usando la misma utilidad que las fotos de boda
    // Carpeta dedicada: avatars/<userId>/
    const s3Result = await uploadToS3(
      file.buffer,
      file.mimetype,
      `avatars/${userId}`,   // "weddingId" se usa como prefijo de carpeta, aquí reutilizamos
    );

    // Borrar el avatar anterior de S3 si existe
    if (user.avatar_url) {
      const oldKey = extractKeyFromUrl(user.avatar_url);
      deleteFromS3(oldKey).catch(err =>
        console.error('[S3] Error al borrar avatar anterior:', err),
      );
    }

    // Guardar nueva URL en la DB
    const updated = await prisma.user.update({
      where: { id: userId },
      data:  { avatar_url: s3Result.url },
      select: { id: true, avatar_url: true, first_name: true, last_name: true },
    });

    return { avatar_url: updated.avatar_url };
  }

  /**
   * Soft delete de la cuenta.
   * Rechaza si el usuario tiene suscripción activa.
   */
  async deleteAccount(userId: string) {
    const activeSub = await prisma.subscription.findFirst({
      where: { user_id: userId, status: { in: ['active', 'trialing'] } },
    });

    if (activeSub) {
      throw new AppError(
        'Cancela tu suscripción activa antes de eliminar la cuenta.',
        409,
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data:  { deleted_at: new Date() },
    });

    return { message: 'Cuenta eliminada correctamente' };
  }
}

export default new UserService();