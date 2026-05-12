import { Router } from 'express';
import budgetController from '../controllers/budget.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  budgetIdSchema,
  createBudgetSchema,
  updateBudgetSchema,
} from '../schemas/budget.schema';

const router = Router();
router.use(authenticate);

router.get('/', budgetController.getAll);
router.post('/', validate(createBudgetSchema), budgetController.create);
router.get('/:id', validate(budgetIdSchema), budgetController.getById);
router.put('/:id', validate(updateBudgetSchema), budgetController.update);
router.delete('/:id', validate(budgetIdSchema), budgetController.remove);
router.get('/:id/categories', validate(budgetIdSchema), budgetController.getCategories);

export default router;
