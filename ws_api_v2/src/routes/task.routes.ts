import { Router } from 'express';
import taskController from '../controllers/task.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  initializeTasksSchema,
  listTasksSchema,
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  taskIdParamSchema,
} from '../schemas/task.schema';

// ─── Router anidado bajo /api/weddings/:weddingId/tasks ──────────
export const weddingTaskRouter = Router({ mergeParams: true });
weddingTaskRouter.use(authenticate);

weddingTaskRouter.post('/initialize', validate(initializeTasksSchema), taskController.initialize);
weddingTaskRouter.get('/', validate(listTasksSchema), taskController.getAll);
weddingTaskRouter.post('/', validate(createTaskSchema), taskController.create);

// ─── Router independiente bajo /api/tasks ────────────────────────
export const taskRouter = Router();
taskRouter.use(authenticate);

taskRouter.patch('/:taskId', validate(updateTaskSchema), taskController.update);
taskRouter.patch('/:taskId/status', validate(updateTaskStatusSchema), taskController.updateStatus);
taskRouter.delete('/:taskId', validate(taskIdParamSchema), taskController.remove);