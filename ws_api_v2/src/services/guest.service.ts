import { randomBytes } from 'crypto';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler.middleware';
import {
  ListGuestsQuery,
  CreateGuestInput,
  CreateCompanionInput,
  UpdateGuestInput,
  UpdateRsvpInput,
  PublicRsvpInput,
} from '../schemas/guest.schema';

export class GuestService {
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

  private async assertGuestAccess(guestId: string, userId: string) {
    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: {
        wedding: {
          include: { user_roles: { where: { user_id: userId }, take: 1 } },
        },
      },
    });

    if (!guest) throw new AppError('Invitado no encontrado', 404);

    const hasAccess =
      guest.wedding.created_by === userId || guest.wedding.user_roles.length > 0;
    if (!hasAccess) throw new AppError('No tienes acceso a este invitado', 403);

    return guest;
  }

  /** Genera un código único de invitación (8 chars, legible) */
  private generateInvitationCode(): string {
    return randomBytes(4).toString('hex').toUpperCase(); // ej: "A3F2B1C9"
  }

  // ─── Endpoints ────────────────────────────────────────────────

  /**
   * GET /api/weddings/:weddingId/guests
   * Lista invitados principales con sus acompañantes anidados.
   */
  async getAll(weddingId: string, userId: string, filters: ListGuestsQuery) {
    await this.assertWeddingAccess(weddingId, userId);

    const guests = await prisma.guest.findMany({
      where: {
        wedding_id: weddingId,
        parent_guest_id: null, // solo invitados principales
        ...(filters.rsvp_status && { rsvp_status: filters.rsvp_status }),
        ...(filters.table_id && { table_id: filters.table_id }),
        ...(filters.search && {
          OR: [
            { first_name: { contains: filters.search, mode: 'insensitive' } },
            { last_name: { contains: filters.search, mode: 'insensitive' } },
            { email: { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        table: { select: { id: true, name: true } },
        ...(filters.include_companions && {
          companions: {
            where: { deleted_at: null },
            select: {
              id: true,
              first_name: true,
              last_name: true,
              rsvp_status: true,
              allergies: true,
              dietary_notes: true,
              table: { select: { id: true, name: true } },
            },
          },
        }),
      },
      orderBy: [{ last_name: 'asc' }, { first_name: 'asc' }],
    });

    // Totales para el dashboard
    const totals = await prisma.guest.groupBy({
      by: ['rsvp_status'],
      where: { wedding_id: weddingId },
      _count: { id: true },
    });

    const totalMap = totals.reduce<Record<string, number>>((acc, t) => {
      acc[t.rsvp_status] = t._count.id;
      return acc;
    }, {});

    return {
      guests,
      totals: {
        total: Object.values(totalMap).reduce((a, b) => a + b, 0),
        confirmed: totalMap['confirmed'] ?? 0,
        declined: totalMap['declined'] ?? 0,
        pending: totalMap['pending'] ?? 0,
      },
    };
  }

  /**
   * GET /api/guests/:guestId
   * Detalle de un invitado con sus acompañantes.
   */
  async getById(guestId: string, userId: string) {
    const guest = await this.assertGuestAccess(guestId, userId);

    return prisma.guest.findUnique({
      where: { id: guestId },
      include: {
        table: { select: { id: true, name: true, shape: true } },
        companions: {
          where: { deleted_at: null },
          include: {
            table: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  /**
   * POST /api/weddings/:weddingId/guests
   * Crea un invitado principal con código de invitación único.
   */
  async create(weddingId: string, userId: string, data: CreateGuestInput) {
    await this.assertWeddingAccess(weddingId, userId);

    // Verificar límite de invitados según plan
    // TODO: implementar cuando esté el módulo de planes
    // const wedding = await prisma.wedding.findUnique({ where: { id: weddingId } });
    // await this.assertGuestLimit(weddingId, wedding!.plan_type);

    // Generar código único (reintentar si colisiona)
    let invitation_code: string;
    let attempts = 0;
    do {
      invitation_code = this.generateInvitationCode();
      const exists = await prisma.guest.findUnique({ where: { invitation_code } });
      if (!exists) break;
      attempts++;
    } while (attempts < 5);

    const guest = await prisma.guest.create({
      data: {
        wedding_id: weddingId,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        allergies: data.allergies,
        dietary_notes: data.dietary_notes,
        invitation_code,
        rsvp_status: 'pending',
      },
      include: {
        table: { select: { id: true, name: true } },
      },
    });

    return guest;
  }

  /**
   * POST /api/weddings/:weddingId/guests/:guestId/companions
   * Añade un acompañante (+1) a un invitado principal.
   */
  async createCompanion(
    weddingId: string,
    parentGuestId: string,
    userId: string,
    data: CreateCompanionInput,
  ) {
    await this.assertWeddingAccess(weddingId, userId);

    // Verificar que el padre existe, pertenece a esta boda y es un invitado principal
    const parent = await prisma.guest.findUnique({ where: { id: parentGuestId } });

    if (!parent) throw new AppError('Invitado principal no encontrado', 404);
    if (parent.wedding_id !== weddingId) throw new AppError('El invitado no pertenece a esta boda', 400);
    if (parent.parent_guest_id !== null) {
      throw new AppError('No se puede añadir un acompañante a otro acompañante', 400);
    }

    const companion = await prisma.guest.create({
      data: {
        wedding_id: weddingId,
        parent_guest_id: parentGuestId,
        first_name: data.first_name,
        last_name: data.last_name,
        allergies: data.allergies,
        dietary_notes: data.dietary_notes,
        rsvp_status: 'pending',
        // Los acompañantes no tienen invitation_code propio
      },
    });

    return companion;
  }

  /**
   * PATCH /api/guests/:guestId
   * Actualiza datos del invitado.
   */
  async update(guestId: string, userId: string, data: UpdateGuestInput) {
    await this.assertGuestAccess(guestId, userId);

    const updated = await prisma.guest.update({
      where: { id: guestId },
      data,
      include: {
        table: { select: { id: true, name: true } },
        companions: {
          where: { deleted_at: null },
          select: { id: true, first_name: true, last_name: true, rsvp_status: true },
        },
      },
    });

    return updated;
  }

  /**
   * PATCH /api/guests/:guestId/rsvp
   * Cambia el estado RSVP (uso interno, autenticado).
   */
  async updateRsvp(guestId: string, userId: string, data: UpdateRsvpInput) {
    await this.assertGuestAccess(guestId, userId);

    const updated = await prisma.guest.update({
      where: { id: guestId },
      data: { rsvp_status: data.rsvp_status },
    });

    return updated;
  }

  /**
   * PATCH /api/rsvp/:code
   * RSVP público — el invitado confirma/declina con su código.
   * No requiere autenticación.
   */
  async publicRsvp(code: string, data: PublicRsvpInput) {
    const guest = await prisma.guest.findUnique({
      where: { invitation_code: code },
      include: {
        wedding: { select: { id: true, rsvp_deadline: true, status: true } },
      },
    });

    if (!guest) throw new AppError('Código de invitación inválido', 404);

    // Verificar que la boda sigue activa
    if (guest.wedding.status !== 'active') {
      throw new AppError('Esta boda ya no acepta confirmaciones', 400);
    }

    // Verificar deadline de RSVP
    if (guest.wedding.rsvp_deadline && new Date() > guest.wedding.rsvp_deadline) {
      throw new AppError('El plazo para confirmar asistencia ha vencido', 400);
    }

    const updated = await prisma.guest.update({
      where: { id: guest.id },
      data: {
        rsvp_status: data.rsvp_status,
        allergies: data.allergies ?? guest.allergies,
        dietary_notes: data.dietary_notes ?? guest.dietary_notes,
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        rsvp_status: true,
        wedding: { select: { name: true, wedding_date: true } },
      },
    });

    return updated;
  }

  /**
   * DELETE /api/guests/:guestId
   * Soft delete. Si es principal, el cascade del schema elimina los acompañantes.
   */
  async remove(guestId: string, userId: string) {
    const guest = await this.assertGuestAccess(guestId, userId);

    // Si tiene mesa asignada, el seat queda libre automáticamente (FK SetNull en schema)
    await prisma.guest.delete({ where: { id: guestId } });

    const isCompanion = guest.parent_guest_id !== null;
    return {
      message: isCompanion
        ? 'Acompañante eliminado correctamente'
        : 'Invitado y sus acompañantes eliminados correctamente',
    };
  }

  /**
   * GET /api/weddings/:weddingId/guests/export
   * Exporta la lista en formato plano (para CSV/Excel en frontend).
   */
  async exportList(weddingId: string, userId: string) {
    await this.assertWeddingAccess(weddingId, userId);

    const guests = await prisma.guest.findMany({
      where: { wedding_id: weddingId },
      include: {
        table: { select: { name: true } },
        parent: { select: { first_name: true, last_name: true } },
      },
      orderBy: [{ parent_guest_id: 'asc' }, { last_name: 'asc' }],
    });

    return guests.map(g => ({
      tipo: g.parent_guest_id ? 'Acompañante' : 'Principal',
      nombre: `${g.first_name} ${g.last_name ?? ''}`.trim(),
      invitado_principal: g.parent
        ? `${g.parent.first_name} ${g.parent.last_name ?? ''}`.trim()
        : null,
      email: g.email,
      telefono: g.phone,
      rsvp: g.rsvp_status,
      mesa: g.table?.name ?? null,
      alergias: g.allergies,
      notas_dieta: g.dietary_notes,
      codigo_invitacion: g.invitation_code,
    }));
  }
}

export default new GuestService();