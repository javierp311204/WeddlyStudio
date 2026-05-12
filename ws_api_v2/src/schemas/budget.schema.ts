import { z } from 'zod';

export const budgetIdSchema = z.object({
  params: z.object({ id: z.string().uuid('ID de presupuesto inválido') }),
});

export const createBudgetSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'El nombre del presupuesto es requerido').max(200),
    totalBudget: z.number().positive('El presupuesto total debe ser mayor a 0'),
    currency: z.string().min(1).max(10),
    guests: z.number().int().nonnegative('El número de invitados debe ser 0 o más'),
    weddingDate: z.string().datetime('Fecha inválida, usa formato ISO 8601'),
  }),
});

export const updateBudgetSchema = z.object({
  params: z.object({ id: z.string().uuid('ID de presupuesto inválido') }),
  body: z.object({
    name: z.string().min(2).max(200).optional(),
    totalBudget: z.number().positive().optional(),
    currency: z.string().min(1).max(10).optional(),
    guests: z.number().int().nonnegative().optional(),
    weddingDate: z.string().datetime().optional(),
  }),
});

export const createExpenseSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'El título es requerido').max(255),
    amount: z.number().positive('La cantidad debe ser mayor a 0'),
    categoryId: z.string().uuid('ID de categoría inválido'),
    date: z.string().datetime('Fecha inválida, usa formato ISO 8601'),
    notes: z.string().max(1000).optional(),
  }),
});

export const updateExpenseSchema = z.object({
  params: z.object({ id: z.string().uuid('ID de gasto inválido') }),
  body: z.object({
    title: z.string().min(1).max(255).optional(),
    amount: z.number().positive().optional(),
    categoryId: z.string().uuid().optional(),
    date: z.string().datetime().optional(),
    notes: z.string().max(1000).optional(),
  }),
});

export const expenseIdSchema = z.object({
  params: z.object({ id: z.string().uuid('ID de gasto inválido') }),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>['body'];
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>['body'];
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>['body'];
export type ExpenseUpdateInput = z.infer<typeof updateExpenseSchema>['body'];
