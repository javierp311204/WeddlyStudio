import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler.middleware';
import { CreateWeddingInput, UpdateWeddingInput, AddWeddingMemberInput } from '../schemas/wedding.schema';

export class WeddingService {
  // ─── Helpers privados ──────────────────────────────────────────

  /**
   * Verifica que el usuario tiene acceso a la boda.
   * Lanza 404 si no existe y 403 si no tiene rol en ella.
   */
  private async assertAccess(weddingId: string, userId: string) {
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      include: {
        user_roles: {
          where: { user_id: userId },
          take: 1,
        },
      },
    });

    if (!wedding) throw new AppError('Boda no encontrada', 404);

    const isCreator = wedding.created_by === userId;
    const hasRole = wedding.user_roles.length > 0;

    if (!isCreator && !hasRole) {
      throw new AppError('No tienes acceso a esta boda', 403);
    }

    return wedding;
  }

  // ─── CRUD principal ────────────────────────────────────────────

  /**
   * GET /api/weddings
   * Lista todas las bodas del usuario autenticado
   */
  async getAll(userId: string) {
    const weddings = await prisma.wedding.findMany({
      where: {
        OR: [
          { created_by: userId },
          { user_roles: { some: { user_id: userId } } },
        ],
      },
      select: {
        id: true,
        name: true,
        wedding_date: true,
        location_name: true,
        status: true,
        plan_type: true,
        created_at: true,
        user_roles: {
          where: { user_id: userId },
          select: { role: true },
        },
        _count: {
          select: {
            guests: true,
            tasks: true,
            photos: true,
          },
        },
      },
      orderBy: { wedding_date: 'asc' },
    });

    return weddings;
  }

  /**
   * GET /api/weddings/:id
   * Detalle completo de una boda
   */
  async getById(weddingId: string, userId: string) {
    await this.assertAccess(weddingId, userId);

    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      include: {
        user_roles: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                avatar_url: true,
              },
            },
          },
        },
        _count: {
          select: {
            guests: true,
            tasks: true,
            photos: true,
            tables: true,
          },
        },
      },
    });

    return wedding;
  }

  /**
   * POST /api/weddings
   * Crear nueva boda
   */
  async create(userId: string, data: CreateWeddingInput) {
    // TODO: validar límite de bodas según plan del usuario
    // const subscription = await this.getUserPlan(userId);
    // if (subscription.plan.max_weddings !== -1) { ... }

    const wedding = await prisma.$transaction(async (tx) => {
      // 1. Crear la boda
      const newWedding = await tx.wedding.create({
        data: {
          name: data.name,
          wedding_date: new Date(data.wedding_date),
          location_name: data.location_name,
          address: data.address,
          dress_code: data.dress_code,
          menu_description: data.menu_description,
          rsvp_deadline: data.rsvp_deadline ? new Date(data.rsvp_deadline) : undefined,
          created_by: userId,
          plan_type: 'free', // por defecto; se actualiza al comprar
        },
      });

      // 2. Asignar rol "bride" al creador automáticamente
      await tx.userWeddingRole.create({
        data: {
          user_id: userId,
          wedding_id: newWedding.id,
          role: 'bride',
        },
      });

      return newWedding;
    });

    return wedding;
  }

  /**
   * PATCH /api/weddings/:id
   * Actualizar datos de la boda
   */
  async update(weddingId: string, userId: string, data: UpdateWeddingInput) {
    await this.assertAccess(weddingId, userId);

    // Solo el creador o planner puede editar
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      include: { user_roles: { where: { user_id: userId } } },
    });

    const isCreator = wedding!.created_by === userId;
    const isPlanner = wedding!.user_roles.some(r => r.role === 'planner');

    if (!isCreator && !isPlanner) {
      throw new AppError('Solo el creador o planner pueden editar la boda', 403);
    }

    const updated = await prisma.wedding.update({
      where: { id: weddingId },
      data: {
        ...data,
        wedding_date: data.wedding_date ? new Date(data.wedding_date) : undefined,
        rsvp_deadline: data.rsvp_deadline ? new Date(data.rsvp_deadline) : undefined,
      },
    });

    return updated;
  }

  /**
   * DELETE /api/weddings/:id
   * Soft delete — solo el creador puede borrar
   */
  async remove(weddingId: string, userId: string) {
    const wedding = await prisma.wedding.findUnique({ where: { id: weddingId } });

    if (!wedding) throw new AppError('Boda no encontrada', 404);
    if (wedding.created_by !== userId) {
      throw new AppError('Solo el creador puede eliminar la boda', 403);
    }

    // softDelete middleware intercepta este delete y pone deleted_at
    await prisma.wedding.delete({ where: { id: weddingId } });

    return { message: 'Boda eliminada correctamente' };
  }

  // ─── Gestión de miembros ───────────────────────────────────────

  /**
   * POST /api/weddings/:id/members
   * Añadir un usuario a la boda con un rol
   */
  async addMember(weddingId: string, requesterId: string, data: AddWeddingMemberInput) {
    const wedding = await prisma.wedding.findUnique({ where: { id: weddingId } });

    if (!wedding) throw new AppError('Boda no encontrada', 404);

    // Solo el creador o planner puede añadir miembros
    const requesterRole = await prisma.userWeddingRole.findFirst({
      where: { wedding_id: weddingId, user_id: requesterId },
    });

    const isCreator = wedding.created_by === requesterId;
    const isPlanner = requesterRole?.role === 'planner';

    if (!isCreator && !isPlanner) {
      throw new AppError('No tienes permisos para añadir miembros', 403);
    }

    // Verificar que el usuario destino existe
    const targetUser = await prisma.user.findUnique({ where: { id: data.user_id } });
    if (!targetUser) throw new AppError('Usuario no encontrado', 404);

    // Verificar que no tiene ya ese rol en esa boda (unique constraint)
    const existing = await prisma.userWeddingRole.findFirst({
      where: { wedding_id: weddingId, user_id: data.user_id, role: data.role },
    });

    if (existing) {
      throw new AppError(`El usuario ya tiene el rol "${data.role}" en esta boda`, 409);
    }

    const member = await prisma.userWeddingRole.create({
      data: {
        wedding_id: weddingId,
        user_id: data.user_id,
        role: data.role,
      },
      include: {
        user: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
    });

    return member;
  }

  /**
   * DELETE /api/weddings/:id/members/:userId
   * Eliminar un miembro de la boda
   */
  async removeMember(weddingId: string, requesterId: string, targetUserId: string) {
    const wedding = await prisma.wedding.findUnique({ where: { id: weddingId } });

    if (!wedding) throw new AppError('Boda no encontrada', 404);

    // No se puede eliminar al creador
    if (targetUserId === wedding.created_by) {
      throw new AppError('No se puede eliminar al creador de la boda', 400);
    }

    const isCreator = wedding.created_by === requesterId;
    const isSelf = requesterId === targetUserId; // un usuario puede salir él mismo

    if (!isCreator && !isSelf) {
      throw new AppError('No tienes permisos para eliminar este miembro', 403);
    }

    await prisma.userWeddingRole.deleteMany({
      where: { wedding_id: weddingId, user_id: targetUserId },
    });

    return { message: 'Miembro eliminado correctamente' };
  }
}

export default new WeddingService();