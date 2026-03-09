import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler.middleware';
import { getPresignedUrl , deleteFromS3, extractKeyFromUrl, uploadAvatarToS3 } from '../utils/s3';

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

    // Borrar avatar anterior
    if (user.avatar_url) {
      const oldKey = extractKeyFromUrl(user.avatar_url);
      deleteFromS3(oldKey).catch(err =>
        console.error('[S3] Error al borrar avatar anterior:', err),
      );
    }

    const { url, key } = await uploadAvatarToS3(file.buffer, userId);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { avatar_url: key }, // ✅ guardar la KEY, no la URL prefirmada
      select: { id: true, avatar_url: true },
    });

    return { avatar_url: url }; // ✅ devolver la URL prefirmada al frontend
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

  async refreshAvatarUrl(key: string): Promise<string> {
    return getPresignedUrl(key, 604800);
}
}

export default new UserService();