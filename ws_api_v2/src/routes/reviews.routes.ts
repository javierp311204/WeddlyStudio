import { Router } from 'express';
import reviewsController from '../controllers/reviews.controller';
import { authenticate } from '../middleware/auth.middleware';

const reviewsRouter = Router();

// Público
reviewsRouter.get('/', reviewsController.getAll);

// Autenticado
reviewsRouter.get('/me',   authenticate, reviewsController.getMine);
reviewsRouter.post('/',    authenticate, reviewsController.create);
reviewsRouter.delete('/:id', authenticate, reviewsController.remove);

export { reviewsRouter };