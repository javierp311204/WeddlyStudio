import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler.middleware';
import { TASK_TEMPLATES } from '../data/task.templates';
import {
  InitializeTasksInput,
  ListTasksQuery,
  CreateTaskInput,
  UpdateTaskInput,
  UpdateTaskStatusInput,
} from '../schemas/task.schema';

export class TaskService {
  // ─── Helpers privados ──────────────────────────────────────────

  /**
   * Verifica que el usuario tiene acceso a la boda.
   */
  private async assertWeddingAccess(weddingId: string, userId: string) {
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      include: {
        user_roles: { where: { user_id: userId }, take: 1 },
      },
    });

    if (!wedding) throw new AppError('Boda no encontrada', 404);

    const hasAccess =
      wedding.created_by === userId || wedding.user_roles.length > 0;

    if (!hasAccess) throw new AppError('No tienes acceso a esta boda', 403);

    return wedding;
  }

  /**
   * Verifica que la tarea existe y pertenece a una boda del usuario.
   */
  private async assertTaskAccess(taskId: string, userId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        wedding: {
          include: {
            user_roles: { where: { user_id: userId }, take: 1 },
          },
        },
      },
    });

    if (!task) throw new AppError('Tarea no encontrada', 404);

    const hasAccess =
      task.wedding.created_by === userId || task.wedding.user_roles.length > 0;

    if (!hasAccess) throw new AppError('No tienes acceso a esta tarea', 403);

    return task;
  }

  // ─── Endpoints ────────────────────────────────────────────────

  /**
   * POST /api/weddings/:weddingId/tasks/initialize
   * Crea en batch las tareas predefinidas para la boda.
   * Si ya existen tareas de una fase, la omite (idempotente).
   */
  async initialize(weddingId: string, userId: string, data: InitializeTasksInput) {
    await this.assertWeddingAccess(weddingId, userId);

    // Filtrar por fases solicitadas o usar todas
    const templates = data.phases
      ? TASK_TEMPLATES.filter(t => data.phases!.includes(t.phase as any))
      : TASK_TEMPLATES;

    if (templates.length === 0) {
      throw new AppError('No se encontraron plantillas para las fases indicadas', 400);
    }

    // Detectar qué fases ya tienen tareas (para no duplicar)
    const existingPhases = await prisma.task.findMany({
      where: { wedding_id: weddingId, phase: { in: templates.map(t => t.phase) } },
      select: { phase: true },
      distinct: ['phase'],
    });

    const existingPhaseSet = new Set(existingPhases.map(t => t.phase));
    const newTemplates = templates.filter(t => !existingPhaseSet.has(t.phase));

    if (newTemplates.length === 0) {
      return { created: 0, message: 'Todas las fases ya estaban inicializadas' };
    }

    const result = await prisma.task.createMany({
      data: newTemplates.map(t => ({
        wedding_id: weddingId,
        title: t.title,
        description: t.description,
        phase: t.phase,
        category: t.category,
        status: 'pending',
      })),
    });

    return {
      created: result.count,
      message: `Se crearon ${result.count} tareas correctamente`,
      skipped_phases: [...existingPhaseSet],
    };
  }

  /**
   * GET /api/weddings/:weddingId/tasks
   * Lista tareas con filtros opcionales.
   */
  async getAll(weddingId: string, userId: string, filters: ListTasksQuery) {
    await this.assertWeddingAccess(weddingId, userId);

    const tasks = await prisma.task.findMany({
      where: {
        wedding_id: weddingId,
        ...(filters.phase && { phase: filters.phase }),
        ...(filters.category && { category: filters.category }),
        ...(filters.status && { status: filters.status }),
        ...(filters.assigned_to_me && { assigned_user_id: userId }),
      },
      include: {
        assigned_user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar_url: true,
          },
        },
      },
      orderBy: [
        { phase: 'asc' },
        { created_at: 'asc' },
      ],
    });

    // Agrupar por fase para facilitar el render del frontend
    const grouped = tasks.reduce<Record<string, typeof tasks>>((acc, task) => {
      const key = task.phase ?? 'sin_fase';
      if (!acc[key]) acc[key] = [];
      acc[key].push(task);
      return acc;
    }, {});

    return {
      tasks,
      grouped,
      totals: {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        cancelled: tasks.filter(t => t.status === 'cancelled').length,
      },
    };
  }

  /**
   * POST /api/weddings/:weddingId/tasks
   * Crea una tarea personalizada.
   */
  async create(weddingId: string, userId: string, data: CreateTaskInput) {
    await this.assertWeddingAccess(weddingId, userId);

    // Verificar que el usuario asignado tiene acceso a la boda
    if (data.assigned_user_id) {
      const assignedRole = await prisma.userWeddingRole.findFirst({
        where: { wedding_id: weddingId, user_id: data.assigned_user_id },
      });
      if (!assignedRole) {
        throw new AppError('El usuario asignado no pertenece a esta boda', 400);
      }
    }

    const task = await prisma.task.create({
      data: {
        wedding_id: weddingId,
        title: data.title,
        description: data.description,
        phase: data.phase,
        category: data.category,
        assigned_user_id: data.assigned_user_id,
        due_date: data.due_date ? new Date(data.due_date) : undefined,
        status: 'pending',
      },
      include: {
        assigned_user: {
          select: { id: true, first_name: true, last_name: true, avatar_url: true },
        },
      },
    });

    return task;
  }

  /**
   * PATCH /api/tasks/:taskId
   * Actualiza campos de la tarea (sin cambiar el estado).
   */
  async update(taskId: string, userId: string, data: UpdateTaskInput) {
    await this.assertTaskAccess(taskId, userId);

    // Verificar que el nuevo usuario asignado tiene acceso a la boda
    if (data.assigned_user_id) {
      const task = await prisma.task.findUnique({ where: { id: taskId }, select: { wedding_id: true } });
      const assignedRole = await prisma.userWeddingRole.findFirst({
        where: { wedding_id: task!.wedding_id, user_id: data.assigned_user_id },
      });
      if (!assignedRole) {
        throw new AppError('El usuario asignado no pertenece a esta boda', 400);
      }
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...data,
        due_date: data.due_date !== undefined
          ? (data.due_date ? new Date(data.due_date) : null)
          : undefined,
      },
      include: {
        assigned_user: {
          select: { id: true, first_name: true, last_name: true, avatar_url: true },
        },
      },
    });

    return updated;
  }

  /**
   * PATCH /api/tasks/:taskId/status
   * Cambia el estado. Al completar → guarda completed_at.
   * Al descompletar → limpia completed_at.
   */
  async updateStatus(taskId: string, userId: string, data: UpdateTaskStatusInput) {
    await this.assertTaskAccess(taskId, userId);

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: data.status,
        // Auto-gestionar completed_at según el estado
        completed_at: data.status === 'completed'
          ? new Date()
          : (data.status === 'pending' || data.status === 'in_progress')
            ? null
            : undefined,
      },
    });

    return updated;
  }

  /**
   * DELETE /api/tasks/:taskId
   * Soft delete de la tarea.
   */
  async remove(taskId: string, userId: string) {
    await this.assertTaskAccess(taskId, userId);

    // softDelete middleware convierte esto en update({ deleted_at })
    await prisma.task.delete({ where: { id: taskId } });

    return { message: 'Tarea eliminada correctamente' };
  }
}

export default new TaskService();