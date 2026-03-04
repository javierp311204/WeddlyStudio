import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler.middleware';
import {
  CreateTableInput,
  UpdateTableInput,
  AssignGuestInput,
  UpdatePositionInput,
  ListTablesQuery,
} from '../schemas/table.schema';

export class TableService {
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

  private async assertTableAccess(tableId: string, userId: string) {
    const table = await prisma.table.findUnique({
      where: { id: tableId },
      include: {
        wedding: {
          include: { user_roles: { where: { user_id: userId }, take: 1 } },
        },
      },
    });

    if (!table) throw new AppError('Mesa no encontrada', 404);

    const hasAccess =
      table.wedding.created_by === userId || table.wedding.user_roles.length > 0;
    if (!hasAccess) throw new AppError('No tienes acceso a esta mesa', 403);

    return table;
  }

  // ─── Endpoints ────────────────────────────────────────────────

  /**
   * GET /api/weddings/:weddingId/tables
   * Lista todas las mesas con sus invitados asignados y estadísticas de ocupación.
   */
  async getAll(weddingId: string, userId: string, filters: ListTablesQuery) {
    await this.assertWeddingAccess(weddingId, userId);

    const tables = await prisma.table.findMany({
      where: { wedding_id: weddingId },
      include: {
        ...(filters.include_guests && {
          guests: {
            where: { deleted_at: null },
            select: {
              id: true,
              first_name: true,
              last_name: true,
              rsvp_status: true,
              seat_number: true,
              parent_guest_id: true,
            },
            orderBy: { seat_number: 'asc' },
          },
        }),
        _count: { select: { guests: true } },
      },
      orderBy: { name: 'asc' },
    });

    // Añadir campo calculado: plazas libres
    const tablesWithOccupancy = tables.map(t => ({
      ...t,
      occupied: t._count.guests,
      available: t.max_capacity - t._count.guests,
      is_full: t._count.guests >= t.max_capacity,
    }));

    // Resumen global del salón
    const totalCapacity = tables.reduce((sum, t) => sum + t.max_capacity, 0);
    const totalOccupied = tables.reduce((sum, t) => sum + t._count.guests, 0);

    return {
      tables: tablesWithOccupancy,
      summary: {
        total_tables: tables.length,
        total_capacity: totalCapacity,
        total_occupied: totalOccupied,
        total_available: totalCapacity - totalOccupied,
      },
    };
  }

  /**
   * GET /api/tables/:tableId
   * Detalle de una mesa con todos sus invitados.
   */
  async getById(tableId: string, userId: string) {
    await this.assertTableAccess(tableId, userId);

    const table = await prisma.table.findUnique({
      where: { id: tableId },
      include: {
        guests: {
          where: { deleted_at: null },
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            rsvp_status: true,
            seat_number: true,
            allergies: true,
            dietary_notes: true,
            parent_guest_id: true,
          },
          orderBy: { seat_number: 'asc' },
        },
        _count: { select: { guests: true } },
      },
    });

    return {
      ...table,
      occupied: table!._count.guests,
      available: table!.max_capacity - table!._count.guests,
      is_full: table!._count.guests >= table!.max_capacity,
    };
  }

  /**
   * POST /api/weddings/:weddingId/tables
   * Crea una nueva mesa.
   */
  async create(weddingId: string, userId: string, data: CreateTableInput) {
    await this.assertWeddingAccess(weddingId, userId);

    // Verificar que no existe otra mesa con el mismo nombre en la misma boda
    const existing = await prisma.table.findFirst({
      where: { wedding_id: weddingId, name: data.name },
    });

    if (existing) {
      throw new AppError(`Ya existe una mesa llamada "${data.name}"`, 409);
    }

    const table = await prisma.table.create({
      data: {
        wedding_id: weddingId,
        name: data.name,
        shape: data.shape,
        max_capacity: data.max_capacity,
        pos_x: data.pos_x,
        pos_y: data.pos_y,
      },
    });

    return table;
  }

  /**
   * PATCH /api/tables/:tableId
   * Actualiza nombre, shape, capacidad o posición.
   */
  async update(tableId: string, userId: string, data: UpdateTableInput) {
    const table = await this.assertTableAccess(tableId, userId);

    // Si se reduce la capacidad, verificar que no deje invitados sin sitio
    if (data.max_capacity !== undefined) {
      const currentOccupied = await prisma.guest.count({
        where: { table_id: tableId, deleted_at: null },
      });

      if (data.max_capacity < currentOccupied) {
        throw new AppError(
          `No puedes reducir la capacidad a ${data.max_capacity}: hay ${currentOccupied} invitados asignados`,
          400,
        );
      }
    }

    // Si se cambia el nombre, verificar que no colisione con otra mesa
    if (data.name && data.name !== table.name) {
      const existing = await prisma.table.findFirst({
        where: { wedding_id: table.wedding_id, name: data.name },
      });
      if (existing) throw new AppError(`Ya existe una mesa llamada "${data.name}"`, 409);
    }

    const updated = await prisma.table.update({
      where: { id: tableId },
      data,
      include: { _count: { select: { guests: true } } },
    });

    return {
      ...updated,
      occupied: updated._count.guests,
      available: updated.max_capacity - updated._count.guests,
    };
  }

  /**
   * PATCH /api/tables/:tableId/position
   * Actualiza solo pos_x y pos_y (llamada frecuente desde drag & drop).
   * Endpoint separado para que sea ligero y rápido.
   */
  async updatePosition(tableId: string, userId: string, data: UpdatePositionInput) {
    await this.assertTableAccess(tableId, userId);

    const updated = await prisma.table.update({
      where: { id: tableId },
      data: { pos_x: data.pos_x, pos_y: data.pos_y },
      select: { id: true, pos_x: true, pos_y: true },
    });

    return updated;
  }

  /**
   * PATCH /api/tables/:tableId/assign
   * Asigna un invitado a la mesa.
   * Usa transacción para validar capacidad de forma segura.
   */
  async assignGuest(tableId: string, userId: string, data: AssignGuestInput) {
    const table = await this.assertTableAccess(tableId, userId);

    // Verificar que el invitado existe y pertenece a la misma boda
    const guest = await prisma.guest.findUnique({ where: { id: data.guest_id } });

    if (!guest) throw new AppError('Invitado no encontrado', 404);
    if (guest.wedding_id !== table.wedding_id) {
      throw new AppError('El invitado no pertenece a esta boda', 400);
    }

    // Si ya está en esta misma mesa, no hacer nada
    if (guest.table_id === tableId) {
      throw new AppError('El invitado ya está asignado a esta mesa', 400);
    }

    // Transacción: verificar capacidad + asignar
    const updatedGuest = await prisma.$transaction(async (tx) => {
      const occupied = await tx.guest.count({
        where: { table_id: tableId, deleted_at: null },
      });

      if (occupied >= table.max_capacity) {
        throw new AppError(
          `Mesa llena: ${occupied}/${table.max_capacity} plazas ocupadas`,
          400,
        );
      }

      return tx.guest.update({
        where: { id: data.guest_id },
        data: {
          table_id: tableId,
          seat_number: data.seat_number ?? null,
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          table_id: true,
          seat_number: true,
        },
      });
    });

    return updatedGuest;
  }

  /**
   * PATCH /api/tables/:tableId/unassign/:guestId
   * Desasigna un invitado de la mesa (lo deja sin mesa).
   */
  async unassignGuest(tableId: string, guestId: string, userId: string) {
    await this.assertTableAccess(tableId, userId);

    const guest = await prisma.guest.findUnique({ where: { id: guestId } });

    if (!guest) throw new AppError('Invitado no encontrado', 404);
    if (guest.table_id !== tableId) {
      throw new AppError('El invitado no está asignado a esta mesa', 400);
    }

    const updated = await prisma.guest.update({
      where: { id: guestId },
      data: { table_id: null, seat_number: null },
      select: { id: true, first_name: true, last_name: true, table_id: true },
    });

    return updated;
  }

  /**
   * DELETE /api/tables/:tableId
   * Elimina la mesa. Los invitados asignados quedan sin mesa (SetNull).
   * Table no tiene deleted_at, se elimina físicamente.
   */
  async remove(tableId: string, userId: string) {
    const table = await this.assertTableAccess(tableId, userId);

    const occupiedCount = await prisma.guest.count({
      where: { table_id: tableId, deleted_at: null },
    });

    // Eliminar la mesa — FK onDelete: SetNull libera a los invitados automáticamente
    await prisma.table.delete({ where: { id: tableId } });

    return {
      message: 'Mesa eliminada correctamente',
      guests_released: occupiedCount,
    };
  }
}

export default new TableService();