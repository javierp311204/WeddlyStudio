import { Router } from 'express';
import taskController from '../controllers/task.controller';
import { authenticate } from '../middleware/auth.middleware';
import { roleGuard, minRoleGuard } from '../middleware/role.guard';
import { validate } from '../middleware/validate.middleware';
import {
  initializeTasksSchema, listTasksSchema, createTaskSchema,
  updateTaskSchema, updateTaskStatusSchema, taskIdParamSchema,
} from '../schemas/task.schema';

// ─── /api/weddings/:weddingId/tasks ──────────────────────────────
export const weddingTaskRouter = Router({ mergeParams: true });
weddingTaskRouter.use(authenticate);

// Solo owner y co_organizer pueden inicializar plantilla
weddingTaskRouter.post('/initialize',
  validate(initializeTasksSchema),
  roleGuard('owner', 'co_organizer'),
  taskController.initialize,
);
// Cualquier miembro puede ver el checklist
weddingTaskRouter.get('/',
  validate(listTasksSchema),
  minRoleGuard('guest'),
  taskController.getAll,
);
// Owner, co_organizer y planner pueden crear tareas
weddingTaskRouter.post('/',
  validate(createTaskSchema),
  roleGuard('owner', 'co_organizer', 'planner'),
  taskController.create,
);

// ─── /api/tasks ───────────────────────────────────────────────────
export const taskRouter = Router();
taskRouter.use(authenticate);

taskRouter.patch('/:taskId',        validate(updateTaskSchema),       taskController.update);
taskRouter.patch('/:taskId/status', validate(updateTaskStatusSchema), taskController.updateStatus);
taskRouter.delete('/:taskId',       validate(taskIdParamSchema),      taskController.remove);