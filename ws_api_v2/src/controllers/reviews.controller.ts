import { Request, Response, NextFunction } from "express";
import prisma from "../config/db";
import { AppError } from "../middleware/errorHandler.middleware";
import { getPresignedUrl } from "../utils/s3";

export class ReviewsController {
  /**
   * GET /api/reviews
   * Público — devuelve todas las reseñas activas ordenadas por fecha o rating
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const order = req.query.order === "rating" ? "rating" : "created_at";

      const reviews = await prisma.review.findMany({
        where: { deleted_at: null },
        orderBy: { [order]: "desc" },
        select: {
          id: true,
          rating: true,
          comment: true,
          created_at: true,
          user: {
            select: {
              first_name: true,
              last_name: true,
              nickname: true,
              avatar_url: true,
            },
          },
        },
      });

      // Generar presigned URLs igual que en getMembers
      const reviewsWithAvatars = await Promise.all(
        reviews.map(async (r) => ({
          ...r,
          user: {
            ...r.user,
            avatar_url: r.user.avatar_url
              ? await getPresignedUrl(r.user.avatar_url, 604800)
              : null,
          },
        })),
      );

      const avg = reviews.length
        ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
        : 0;

      res.json({
        success: true,
        data: {
          reviews: reviewsWithAvatars,
          total: reviewsWithAvatars.length,
          average: Math.round(avg * 10) / 10,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/reviews
   * Autenticado — crea o actualiza la reseña del usuario (upsert)
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { rating, comment } = req.body;

      // Validaciones
      if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
        throw new AppError("La puntuación debe ser un número entre 1 y 5", 400);
      }
      if (
        !comment ||
        typeof comment !== "string" ||
        comment.trim().length < 10
      ) {
        throw new AppError(
          "El comentario debe tener al menos 10 caracteres",
          400,
        );
      }
      if (comment.trim().length > 1000) {
        throw new AppError(
          "El comentario no puede superar los 1000 caracteres",
          400,
        );
      }

      // Antispam básico: detectar URLs y patrones de spam
      const spamPatterns = /https?:\/\/|www\.|(.)\1{6,}/i;
      if (spamPatterns.test(comment)) {
        throw new AppError(
          "El comentario contiene contenido no permitido",
          400,
        );
      }

      const review = await prisma.review.upsert({
        where: { user_id: userId },
        create: { user_id: userId, rating, comment: comment.trim() },
        update: {
          rating,
          comment: comment.trim(),
          deleted_at: null,
          updated_at: new Date(),
        },
        select: {
          id: true,
          rating: true,
          comment: true,
          created_at: true,
          updated_at: true,
        },
      });

      res.status(201).json({ success: true, data: review });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/reviews/:id
   * Soft delete — solo el propio usuario o un admin global
   */
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const review = await prisma.review.findUnique({
        where: { id, deleted_at: null },
      });

      if (!review) throw new AppError("Reseña no encontrada", 404);

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role_global: true },
      });

      const isOwner = review.user_id === userId;
      const isAdmin = user?.role_global === "admin";

      if (!isOwner && !isAdmin) {
        throw new AppError("No tienes permiso para eliminar esta reseña", 403);
      }

      await prisma.review.update({
        where: { id },
        data: { deleted_at: new Date() },
      });

      res.json({ success: true, message: "Reseña eliminada" });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/reviews/me
   * Autenticado — devuelve la reseña del usuario actual (si existe)
   */
  async getMine(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      const review = await prisma.review.findUnique({
        where: { user_id: userId },
        select: {
          id: true,
          rating: true,
          comment: true,
          created_at: true,
          deleted_at: true,
        },
      });

      res.json({ success: true, data: review ?? null });
    } catch (err) {
      next(err);
    }
  }
}

export default new ReviewsController();
