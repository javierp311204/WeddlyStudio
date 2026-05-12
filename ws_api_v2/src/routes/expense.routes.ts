import { Router } from 'express';
import budgetController from '../controllers/budget.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createExpenseSchema,
  expenseIdSchema,
  updateExpenseSchema,
} from '../schemas/budget.schema';

const router = Router();
router.use(authenticate);

router.post('/', validate(createExpenseSchema), budgetController.createExpense);
router.put('/:id', validate(updateExpenseSchema), budgetController.updateExpense);
router.delete('/:id', validate(expenseIdSchema), budgetController.removeExpense);

export default router;
