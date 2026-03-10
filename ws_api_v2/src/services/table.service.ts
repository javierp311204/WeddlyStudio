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
    // FIX: añadir deleted_at: null para no operar sobre bodas soft-deleted
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId, deleted_at: null },
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

    // FIX: verificar también que la boda no está soft-deleted
    if (table.wedding.deleted_at !== null) {
      throw new AppError('Boda no encontrada', 404);
    }

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
              id:              true,
              first_name:      true,
              last_name:       true,
              group:           true,   // campo nuevo
              rsvp_status:     true,
              seat_number:     true,
              parent_guest_id: true,
            },
            orderBy: { seat_number: 'asc' },
          },
        }),
        // FIX: _count solo cuenta invitados activos (no soft-deleted)
        // Antes _count no filtraba deleted_at → occupied/available eran incorrectos
        _count: {
          select: {
            guests: { where: { deleted_at: null } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const tablesWithOccupancy = tables.map((t) => ({
      ...t,
      occupied:  t._count.guests,
      available: t.max_capacity - t._count.guests,
      is_full:   t._count.guests >= t.max_capacity,
    }));

    const totalCapacity = tables.reduce((sum, t) => sum + t.max_capacity, 0);
    const totalOccupied = tables.reduce((sum, t) => sum + t._count.guests, 0);

    return {
      tables: tablesWithOccupancy,
      summary: {
        total_tables:    tables.length,
        total_capacity:  totalCapacity,
        total_occupied:  totalOccupied,
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
            id:              true,
            first_name:      true,
            last_name:       true,
            email:           true,
            group:           true,   
            rsvp_status:     true,
            seat_number:     true,
            allergies:       true,
            dietary_notes:   true,
            parent_guest_id: true,
          },
          orderBy: { seat_number: 'asc' },
        },
        // FIX: _count con filtro deleted_at
        _count: {
          select: {
            guests: { where: { deleted_at: null } },
          },
        },
      },
    });

    return {
      ...table,
      occupied:  table!._count.guests,
      available: table!.max_capacity - table!._count.guests,
      is_full:   table!._count.guests >= table!.max_capacity,
    };
  }

  /**
   * POST /api/weddings/:weddingId/tables
   */
  async create(weddingId: string, userId: string, data: CreateTableInput) {
    await this.assertWeddingAccess(weddingId, userId);

    const existing = await prisma.table.findFirst({
      where: { wedding_id: weddingId, name: data.name },
    });
    if (existing) {
      throw new AppError(`Ya existe una mesa llamada "${data.name}"`, 409);
    }

    const table = await prisma.table.create({
      data: {
        wedding_id:   weddingId,
        name:         data.name,
        shape:        data.shape,
        max_capacity: data.max_capacity,
        pos_x:        data.pos_x,
        pos_y:        data.pos_y,
      },
    });

    return table;
  }

  /**
   * PATCH /api/tables/:tableId
   */
  async update(tableId: string, userId: string, data: UpdateTableInput) {
    const table = await this.assertTableAccess(tableId, userId);

    if (data.max_capacity !== undefined) {
      // FIX: usar el mismo filtro deleted_at para coherencia
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

    if (data.name && data.name !== table.name) {
      const existing = await prisma.table.findFirst({
        where: { wedding_id: table.wedding_id, name: data.name },
      });
      if (existing) throw new AppError(`Ya existe una mesa llamada "${data.name}"`, 409);
    }

    const updated = await prisma.table.update({
      where: { id: tableId },
      data,
      include: {
        _count: { select: { guests: { where: { deleted_at: null } } } },
      },
    });

    return {
      ...updated,
      occupied:  updated._count.guests,
      available: updated.max_capacity - updated._count.guests,
    };
  }

  /**
   * PATCH /api/tables/:tableId/position
   */
  async updatePosition(tableId: string, userId: string, data: UpdatePositionInput) {
    await this.assertTableAccess(tableId, userId);

    const updated = await prisma.table.update({
      where: { id: tableId },
      data:  { pos_x: data.pos_x, pos_y: data.pos_y },
      select: { id: true, pos_x: true, pos_y: true },
    });

    return updated;
  }

  /**
   * PATCH /api/tables/:tableId/assign
   */
  async assignGuest(tableId: string, userId: string, data: AssignGuestInput) {
    const table = await this.assertTableAccess(tableId, userId);

    // FIX: filtrar invitados soft-deleted — antes se podía asignar un guest eliminado
    const guest = await prisma.guest.findUnique({
      where: { id: data.guest_id, deleted_at: null },
    });

    if (!guest) throw new AppError('Invitado no encontrado', 404);
    if (guest.wedding_id !== table.wedding_id) {
      throw new AppError('El invitado no pertenece a esta boda', 400);
    }
    if (guest.table_id === tableId) {
      throw new AppError('El invitado ya está asignado a esta mesa', 400);
    }

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
          table_id:    tableId,
          seat_number: data.seat_number ?? null,
        },
        select: {
          id:          true,
          first_name:  true,
          last_name:   true,
          table_id:    true,
          seat_number: true,
        },
      });
    });

    return updatedGuest;
  }

  /**
   * PATCH /api/tables/:tableId/unassign/:guestId
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
      data:  { table_id: null, seat_number: null },
      select: { id: true, first_name: true, last_name: true, table_id: true },
    });

    return updated;
  }

  /**
   * DELETE /api/tables/:tableId
   * FK onDelete: SetNull libera a los invitados automáticamente.
   */
  async remove(tableId: string, userId: string) {
    await this.assertTableAccess(tableId, userId);

    // FIX: usar deleted_at: null para el conteo real de liberados
    const occupiedCount = await prisma.guest.count({
      where: { table_id: tableId, deleted_at: null },
    });

    await prisma.table.delete({ where: { id: tableId } });

    return {
      message:         'Mesa eliminada correctamente',
      guests_released: occupiedCount,
    };
  }
}

export default new TableService();