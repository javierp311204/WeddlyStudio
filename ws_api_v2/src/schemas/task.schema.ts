import { z } from 'zod';
import { PHASES_ORDER, TASK_CATEGORIES } from '../data/task.templates';

// ─── Params comunes ──────────────────────────────────────────────
export const weddingIdParamSchema = z.object({
  params: z.object({
    weddingId: z.string().uuid('ID de boda inválido'),
  }),
});

export const taskIdParamSchema = z.object({
  params: z.object({
    taskId: z.string().uuid('ID de tarea inválido'),
  }),
});

// ─── Inicializar checklist ───────────────────────────────────────
export const initializeTasksSchema = z.object({
  params: z.object({
    weddingId: z.string().uuid('ID de boda inválido'),
  }),
  body: z.object({
    phases: z
      .array(z.enum(PHASES_ORDER))
      .optional()
      .describe('Si no se envía, se inicializan todas las fases'),
  }),
});

// ─── Listar tareas (query filters) ──────────────────────────────
export const listTasksSchema = z.object({
  params: z.object({
    weddingId: z.string().uuid('ID de boda inválido'),
  }),
  query: z.object({
    phase: z.enum(PHASES_ORDER).optional(),
    category: z.enum(TASK_CATEGORIES).optional(),
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
    assigned_to_me: z
      .string()
      .optional()
      .transform(v => v === 'true'),
  }),
});

// ─── Crear tarea custom ──────────────────────────────────────────
export const createTaskSchema = z.object({
  params: z.object({
    weddingId: z.string().uuid('ID de boda inválido'),
  }),
  body: z.object({
    title: z.string().min(1, 'El título es requerido').max(255),
    description: z.string().optional(),
    phase: z.enum(PHASES_ORDER).optional(),
    category: z.enum(TASK_CATEGORIES).optional(),
    assigned_user_id: z.string().uuid('ID de usuario inválido').optional(),
    due_date: z.string().datetime('Fecha inválida, usa formato ISO 8601').optional(),
  }),
});

// ─── Actualizar tarea ────────────────────────────────────────────
export const updateTaskSchema = z.object({
  params: z.object({
    taskId: z.string().uuid('ID de tarea inválido'),
  }),
  body: z
    .object({
      title: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      phase: z.enum(PHASES_ORDER).optional(),
      category: z.enum(TASK_CATEGORIES).optional(),
      assigned_user_id: z.string().uuid().nullable().optional(),
      due_date: z.string().datetime().nullable().optional(),
    })
    .refine(data => Object.keys(data).length > 0, {
      message: 'Debes enviar al menos un campo para actualizar',
    }),
});

// ─── Cambiar estado ──────────────────────────────────────────────
export const updateTaskStatusSchema = z.object({
  params: z.object({
    taskId: z.string().uuid('ID de tarea inválido'),
  }),
  body: z.object({
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled'], {
      message: 'Estado inválido: pending | in_progress | completed | cancelled',
    }),
  }),
});

// ─── Tipos inferidos ─────────────────────────────────────────────
export type InitializeTasksInput = z.infer<typeof initializeTasksSchema>['body'];
export type ListTasksQuery = z.infer<typeof listTasksSchema>['query'];
export type CreateTaskInput = z.infer<typeof createTaskSchema>['body'];
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>['body'];
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>['body'];