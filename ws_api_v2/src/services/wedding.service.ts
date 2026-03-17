import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler.middleware';
import {
  CreateWeddingInput,
  UpdateWeddingInput,
  AddWeddingMemberInput,
} from '../schemas/wedding.schema';

// ─── Límites por plan ─────────────────────────────────────────────
const PLAN_LIMITS: Record<string, { max_guests: number; max_photos: number; max_weddings: number }> = {
  free:         { max_guests: 40,  max_photos: 20, max_weddings: 1  },
  one_time:     { max_guests: -1,  max_photos: 80, max_weddings: 1  },
  subscription: { max_guests: -1,  max_photos: 80, max_weddings: -1 },
};

export class WeddingService {

  // ─── Helper: verificar que el usuario es owner ────────────────
  private async assertOwner(id: string, userId: string) {
    const wedding = await prisma.wedding.findUnique({ where: { id } });
    if (!wedding)                      throw new AppError('Boda no encontrada', 404);
    if (wedding.created_by !== userId) throw new AppError('Solo el creador puede realizar esta acción', 403);
    return wedding;
  }

  // ─── Helper: verificar acceso (owner o miembro) ───────────────
  private async assertAccess(id: string, userId: string) {
    const wedding = await prisma.wedding.findUnique({
      where: { id },
      include: {
        user_roles: { where: { user_id: userId }, take: 1 },
      },
    });
    if (!wedding) throw new AppError('Boda no encontrada', 404);

    const hasAccess = wedding.created_by === userId || wedding.user_roles.length > 0;
    if (!hasAccess) throw new AppError('No tienes acceso a esta boda', 403);

    return wedding;
  }

  // ─── Helper: plan activo del usuario ─────────────────────────
  private async getActivePlan(userId: string): Promise<string> {
    // 1. Suscripción activa del usuario → plan subscription
    const activeSub = await prisma.subscription.findFirst({
      where: {
        user_id: userId,
        status: { in: ['active', 'trialing'] },
      },
    });
    if (activeSub) return 'subscription';

    // 2. Pago completado asociado a una boda one_time
    const oneTimeWedding = await prisma.wedding.findFirst({
      where: {
        created_by: userId,
        plan_type: 'one_time',
        payments: {
          some: { status: 'completed' },
        },
      },
    });
    if (oneTimeWedding) return 'one_time';

    // 3. Fallback — plan_type de las bodas (legado / test)
    const weddings = await prisma.wedding.findMany({
      where:  { created_by: userId },
      select: { plan_type: true },
    });
    const priority = ['subscription', 'one_time', 'free'];
    return priority.find(p => weddings.some(w => w.plan_type === p)) ?? 'free';
  }
  
  // ─── GET /api/weddings ────────────────────────────────────────
  async getAll(userId: string) {
    const roles = await prisma.userWeddingRole.findMany({
      where: { user_id: userId },
      include: {
        wedding: {
          select: {
            id: true, name: true, wedding_date: true,
            location_name: true, address: true, dress_code: true,
            status: true, plan_type: true, created_by: true, created_at: true,
            readonly_reason: true,
            _count: { select: { guests: true, tables: true, tasks: true } },
          },
        },
      },
      orderBy: { assigned_at: 'asc' },
    });

    // Bodas creadas por el usuario sin rol asignado (edge case)
    const assignedIds = roles.map(r => r.wedding_id);
    const orphaned = await prisma.wedding.findMany({
      where: { created_by: userId, id: { notIn: assignedIds } },
      select: {
        id: true, name: true, wedding_date: true, location_name: true,
        address: true, dress_code: true, status: true, plan_type: true,
        created_by: true, created_at: true,
        _count: { select: { guests: true, tables: true, tasks: true } },
      },
    });

    const fromRoles = roles.map(r => ({
      ...r.wedding,
      my_role:  r.role,
      is_owner: r.wedding.created_by === userId,
    }));

    const fromOrphaned = orphaned.map(w => ({
      ...w,
      my_role:  'owner' as const,
      is_owner: true,
    }));

    return [...fromRoles, ...fromOrphaned].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }

  // ─── GET /api/weddings/can-create ────────────────────────────
  async canCreate(userId: string): Promise<{
    allowed: boolean; plan: string; limit: number; current: number;
  }> {
    const existing = await prisma.wedding.findMany({
      where: { created_by: userId },
      select: { id: true },
    });

    const plan    = await this.getActivePlan(userId);
    const limits  = PLAN_LIMITS[plan] ?? PLAN_LIMITS['free'];
    const limit   = limits.max_weddings;
    const current = existing.length;
    const allowed = limit === -1 || current < limit;

    return { allowed, plan, limit, current };
  }

  // ─── GET /api/weddings/:id ────────────────────────────────────
  async getById(id: string, userId: string) {
    return this.assertAccess(id, userId);
  }

  // ─── POST /api/weddings ───────────────────────────────────────
  async create(userId: string, data: CreateWeddingInput) {
    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { email_verified: true, google_id: true },
    });

    if (!user) throw new AppError('Usuario no encontrado', 404);

    // Los usuarios de Google tienen el email verificado por defecto
    // si google_id está presente — pero igualmente exigimos email_verified
    if (!user.email_verified) {
      throw new AppError(
        'Debes verificar tu email antes de crear una boda. Revisa tu bandeja de entrada.',
        403,
        'EMAIL_NOT_VERIFIED',
      );
    }

    const { allowed, plan, limit } = await this.canCreate(userId);

    if (!allowed) {
      throw new AppError(
        `Tu plan "${plan}" solo permite ${limit} boda(s). Actualiza a Premium para gestionar múltiples bodas.`,
        403,
        'PLAN_LIMIT_REACHED',
      );
    }

    const wedding = await prisma.wedding.create({
      data: {
        name:             data.name,
        wedding_date:     data.wedding_date ? new Date(data.wedding_date) : new Date(),
        location_name:    data.location_name ?? null,
        address:          data.address ?? null,
        dress_code:       data.dress_code ?? null,
        menu_description: data.menu_description ?? null,
        rsvp_deadline:    data.rsvp_deadline ? new Date(data.rsvp_deadline) : null,
        created_by:       userId,
        // FIX: heredar plan del usuario
        plan_type:        (plan === 'subscription' ? 'subscription' : plan === 'one_time' ? 'one_time' : 'free') as any,
        status:           'active',
      },
    });

    // Asignar rol de bride al creador automáticamente
    await prisma.userWeddingRole.create({
      data: { user_id: userId, wedding_id: wedding.id, role: 'owner' },
    });

    return wedding;
  }

  // ─── PATCH /api/weddings/:id ──────────────────────────────────
  async update(id: string, userId: string, data: UpdateWeddingInput) {
    await this.assertOwner(id, userId);

    // FIX: construir el objeto explícitamente para evitar el tipo false | {...}
    // que genera el spread condicional &&
    const updateData: Record<string, unknown> = {};
    if (data.name             !== undefined) updateData['name']             = data.name;
    if (data.wedding_date     !== undefined) updateData['wedding_date']     = data.wedding_date ? new Date(data.wedding_date) : null;
    if (data.location_name    !== undefined) updateData['location_name']    = data.location_name;
    if (data.address          !== undefined) updateData['address']          = data.address;
    if (data.dress_code       !== undefined) updateData['dress_code']       = data.dress_code;
    if (data.menu_description !== undefined) updateData['menu_description'] = data.menu_description;
    if (data.rsvp_deadline    !== undefined) updateData['rsvp_deadline']    = data.rsvp_deadline ? new Date(data.rsvp_deadline) : null;

    return prisma.wedding.update({ where: { id }, data: updateData });
  }

  // ─── DELETE /api/weddings/:id ─────────────────────────────────
  async remove(id: string, userId: string) {
    await this.assertOwner(id, userId);

    // Contar bodas activas del usuario
    const totalBodas = await prisma.wedding.count({
      where: { created_by: userId },
    });

    // Solo bloquear si tiene suscripción activa Y es la única boda.
    // Si tiene 2+ bodas puede borrar una libremente.
    if (totalBodas === 1) {
      const activeSub = await prisma.subscription.findFirst({
        where: { user_id: userId, status: { in: ['active', 'trialing'] } },
      });

      if (activeSub) {
        throw new AppError(
          'No puedes eliminar tu única boda con una suscripción activa. Cancela la suscripción primero.',
          409,
          'ACTIVE_SUBSCRIPTION',
        );
      }
    }

    // Hard delete con SQL raw — evita que el middleware de soft delete
    // intercepte el prisma.wedding.delete() y lo convierta en UPDATE deleted_at.
    // Borramos en cascada manual porque payments y activity_logs tienen onDelete: SetNull
    // (no se borran automáticamente con el wedding).

    // 1. Nullify payments.wedding_id (onDelete: SetNull — no se pueden borrar)
    await prisma.$executeRawUnsafe(
      `UPDATE payments SET wedding_id = NULL WHERE wedding_id = $1::uuid`,
      id,
    );

    // 2. Nullify activity_logs.wedding_id (onDelete: SetNull)
    await prisma.$executeRawUnsafe(
      `UPDATE activity_logs SET wedding_id = NULL WHERE wedding_id = $1::uuid`,
      id,
    );

    // 3. Hard delete de la boda — las tablas con onDelete: Cascade se borran solas:
    //    user_wedding_roles, guests, tables, photos, tasks, events, invitations,
    //    invitation_sends (via invitation → cascade)
    await prisma.$executeRawUnsafe(
      `DELETE FROM weddings WHERE id = $1::uuid`,
      id,
    );

    return { message: 'Boda eliminada correctamente' };
  }

  // ─── POST /api/weddings/:id/members ──────────────────────────
  async addMember(id: string, requesterId: string, data: AddWeddingMemberInput) {
    await this.assertOwner(id, requesterId);

    const targetUser = await prisma.user.findUnique({ where: { id: data.user_id } });
    if (!targetUser) throw new AppError('Usuario no encontrado', 404);

    // FIX: el compound unique es user_id_wedding_id_role (3 campos), no user_id_wedding_id
    const existing = await prisma.userWeddingRole.findFirst({
      where: { user_id: data.user_id, wedding_id: id, role: data.role },
    });
    if (existing) throw new AppError('Este usuario ya tiene ese rol en la boda', 409);

    return prisma.userWeddingRole.create({
      data: { user_id: data.user_id, wedding_id: id, role: data.role },
      include: {
        user: { select: { id: true, first_name: true, last_name: true, email: true } },
      },
    });
  }

  // ─── DELETE /api/weddings/:id/members/:userId ─────────────────
  async removeMember(id: string, requesterId: string, targetUserId: string) {
    await this.assertOwner(id, requesterId);

    if (requesterId === targetUserId) {
      throw new AppError('No puedes eliminarte a ti mismo como miembro', 400);
    }

    // FIX: usar findFirst en vez de findUnique con compound key de 3 campos
    const existing = await prisma.userWeddingRole.findFirst({
      where: { user_id: targetUserId, wedding_id: id },
    });
    if (!existing) throw new AppError('Este usuario no es miembro de la boda', 404);

    // Eliminar todos los roles del usuario en esta boda
    await prisma.userWeddingRole.deleteMany({
      where: { user_id: targetUserId, wedding_id: id },
    });

    return { message: 'Miembro eliminado correctamente' };
  }
}

export default new WeddingService();