import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler.middleware';
import {
  CreateBudgetInput,
  CreateExpenseInput,
  ExpenseUpdateInput,
  UpdateBudgetInput,
} from '../schemas/budget.schema';

const CATEGORY_ALLOCATIONS: Record<string, number> = {
  Venue: 0.35,
  Catering: 0.25,
  Photography: 0.10,
  Decoration: 0.08,
  Dress: 0.05,
  'Music / DJ': 0.05,
  Invitations: 0.03,
  Transport: 0.03,
  Honeymoon: 0.04,
  Extras: 0.02,
};

const buildCategoryDefinitions = (totalBudget: number) => {
  return Object.entries(CATEGORY_ALLOCATIONS).map(([name, pct]) => ({
    name,
    allocatedAmount: Number((totalBudget * pct).toFixed(2)),
    spentAmount: 0,
  }));
};

const toNumber = (value: any) => {
  if (typeof value === 'number') return value;
  if (value?.toNumber) return value.toNumber();
  return Number(value || 0);
};

export class BudgetService {
  private async assertBudgetOwnership(budgetId: string, userId: string) {
    const budget = await prisma.budget.findUnique({
      where: { id: budgetId },
      include: { user: true },
    });

    if (!budget) throw new AppError('Presupuesto no encontrado', 404);
    if (budget.user_id !== userId) throw new AppError('No tienes acceso a este presupuesto', 403);

    return budget;
  }

  private async assertCategoryOwnership(categoryId: string, userId: string) {
    const category = await prisma.budgetCategory.findUnique({
      where: { id: categoryId },
      include: { budget: true },
    });

    if (!category) throw new AppError('Categoría no encontrada', 404);
    if (category.budget.user_id !== userId) throw new AppError('No tienes acceso a esta categoría', 403);

    return category;
  }

  private async assertExpenseOwnership(expenseId: string, userId: string) {
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: { category: { include: { budget: true } } },
    });

    if (!expense) throw new AppError('Gasto no encontrado', 404);
    if (expense.category.budget.user_id !== userId) throw new AppError('No tienes acceso a este gasto', 403);

    return expense;
  }

  async getAll(userId: string) {
    const budgets = await prisma.budget.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      include: {
        categories: { orderBy: { name: 'asc' } },
      },
    });

    return budgets.map((budget) => {
      const categories = budget.categories.map((category) => ({
        id: category.id,
        name: category.name,
        allocatedAmount: toNumber(category.allocated_amount),
        spentAmount: toNumber(category.spent_amount),
        remainingAmount: Number(
          (toNumber(category.allocated_amount) - toNumber(category.spent_amount)).toFixed(2),
        ),
      }));

      const totalSpent = categories.reduce((sum, c) => sum + c.spentAmount, 0);
      return {
        id: budget.id,
        name: budget.name,
        currency: budget.currency,
        totalBudget: toNumber(budget.total_budget),
        guests: budget.guests,
        weddingDate: budget.wedding_date.toISOString(),
        createdAt: budget.created_at.toISOString(),
        categories,
        totalSpent,
        remainingAmount: Number((toNumber(budget.total_budget) - totalSpent).toFixed(2)),
      };
    });
  }

  async create(data: CreateBudgetInput, userId: string) {
    const categories = buildCategoryDefinitions(data.totalBudget);

    const budget = await prisma.budget.create({
      data: {
        user_id: userId,
        name: data.name,
        total_budget: data.totalBudget,
        currency: data.currency,
        guests: data.guests,
        wedding_date: new Date(data.weddingDate),
        categories: {
          create: categories.map((category) => ({
            name: category.name,
            allocated_amount: category.allocatedAmount,
            spent_amount: category.spentAmount,
          })),
        },
      },
      include: { categories: true },
    });

    return this.getById(budget.id, userId);
  }

  async getById(budgetId: string, userId: string) {
    await this.assertBudgetOwnership(budgetId, userId);

    const budget = await prisma.budget.findUnique({
      where: { id: budgetId },
      include: {
        categories: {
          orderBy: { name: 'asc' },
          include: { expenses: { orderBy: { expense_date: 'desc' } } },
        },
      },
    });

    if (!budget) throw new AppError('Presupuesto no encontrado', 404);

    const categories = budget.categories.map((category) => ({
      id: category.id,
      name: category.name,
      allocatedAmount: toNumber(category.allocated_amount),
      spentAmount: toNumber(category.spent_amount),
      remainingAmount: Number(
        (toNumber(category.allocated_amount) - toNumber(category.spent_amount)).toFixed(2),
      ),
      expenses: category.expenses.map((expense) => ({
        id: expense.id,
        title: expense.title,
        amount: toNumber(expense.amount),
        date: expense.expense_date.toISOString(),
        notes: expense.notes,
        categoryId: category.id,
        createdAt: expense.created_at.toISOString(),
      })),
    }));

    const totalSpent = categories.reduce((sum, category) => sum + category.spentAmount, 0);

    return {
      id: budget.id,
      name: budget.name,
      currency: budget.currency,
      totalBudget: toNumber(budget.total_budget),
      guests: budget.guests,
      weddingDate: budget.wedding_date.toISOString(),
      createdAt: budget.created_at.toISOString(),
      categories,
      totalSpent,
      remainingAmount: Number((toNumber(budget.total_budget) - totalSpent).toFixed(2)),
    };
  }

  async update(budgetId: string, userId: string, data: UpdateBudgetInput) {
    const budget = await this.assertBudgetOwnership(budgetId, userId);

    const updates: any = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.currency !== undefined) updates.currency = data.currency;
    if (data.guests !== undefined) updates.guests = data.guests;
    if (data.weddingDate !== undefined) updates.wedding_date = new Date(data.weddingDate);
    if (data.totalBudget !== undefined) updates.total_budget = data.totalBudget;

    const queries = [];
    if (Object.keys(updates).length > 0) {
      queries.push(prisma.budget.update({ where: { id: budgetId }, data: updates }));
    }

    if (data.totalBudget !== undefined) {
      const categoryUpdates = Object.entries(CATEGORY_ALLOCATIONS).map(([name, pct]) => {
        return prisma.budgetCategory.updateMany({
          where: { budget_id: budgetId, name },
          data: {
            allocated_amount: Number((data.totalBudget! * pct).toFixed(2)),
          },
        });
      });
      queries.push(...categoryUpdates);
    }

    await prisma.$transaction(queries);
    return this.getById(budgetId, userId);
  }

  async remove(budgetId: string, userId: string) {
    await this.assertBudgetOwnership(budgetId, userId);
    await prisma.budget.delete({ where: { id: budgetId } });
    return { message: 'Presupuesto eliminado correctamente' };
  }

  async getCategories(budgetId: string, userId: string) {
    await this.assertBudgetOwnership(budgetId, userId);

    const categories = await prisma.budgetCategory.findMany({
      where: { budget_id: budgetId },
      orderBy: { name: 'asc' },
    });

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      allocatedAmount: toNumber(category.allocated_amount),
      spentAmount: toNumber(category.spent_amount),
      remainingAmount: Number(
        (toNumber(category.allocated_amount) - toNumber(category.spent_amount)).toFixed(2),
      ),
    }));
  }

  async createExpense(data: CreateExpenseInput, userId: string) {
    const category = await this.assertCategoryOwnership(data.categoryId, userId);
    const amount = data.amount;

    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          title: data.title,
          amount,
          budget_category_id: category.id,
          notes: data.notes,
          expense_date: new Date(data.date),
        },
      });

      await tx.budgetCategory.update({
        where: { id: category.id },
        data: { spent_amount: { increment: amount } },
      });

      return created;
    });

    return {
      id: expense.id,
      title: expense.title,
      amount: toNumber(expense.amount),
      categoryId: expense.budget_category_id,
      date: expense.expense_date.toISOString(),
      notes: expense.notes,
    };
  }

  async updateExpense(expenseId: string, userId: string, data: ExpenseUpdateInput) {
    const expense = await this.assertExpenseOwnership(expenseId, userId);
    const newCategoryId = data.categoryId ?? expense.budget_category_id;
    const newAmount = data.amount !== undefined ? data.amount : toNumber(expense.amount);

    if (newCategoryId !== expense.budget_category_id) {
      await this.assertCategoryOwnership(newCategoryId, userId);
    }

    const updatedExpense = await prisma.$transaction(async (tx) => {
      if (newCategoryId !== expense.budget_category_id) {
        await tx.budgetCategory.update({
          where: { id: expense.budget_category_id },
          data: { spent_amount: { decrement: toNumber(expense.amount) } },
        });
        await tx.budgetCategory.update({
          where: { id: newCategoryId },
          data: { spent_amount: { increment: newAmount } },
        });
      } else if (newAmount !== toNumber(expense.amount)) {
        await tx.budgetCategory.update({
          where: { id: expense.budget_category_id },
          data: { spent_amount: { increment: Number((newAmount - toNumber(expense.amount)).toFixed(2)) } },
        });
      }

      return tx.expense.update({
        where: { id: expenseId },
        data: {
          title: data.title ?? expense.title,
          amount: newAmount,
          notes: data.notes ?? expense.notes,
          expense_date: data.date ? new Date(data.date) : expense.expense_date,
          budget_category_id: newCategoryId,
        },
      });
    });

    return {
      id: updatedExpense.id,
      title: updatedExpense.title,
      amount: toNumber(updatedExpense.amount),
      categoryId: updatedExpense.budget_category_id,
      date: updatedExpense.expense_date.toISOString(),
      notes: updatedExpense.notes,
    };
  }

  async removeExpense(expenseId: string, userId: string) {
    const expense = await this.assertExpenseOwnership(expenseId, userId);

    await prisma.$transaction(async (tx) => {
      await tx.budgetCategory.update({
        where: { id: expense.budget_category_id },
        data: { spent_amount: { decrement: toNumber(expense.amount) } },
      });
      await tx.expense.delete({ where: { id: expenseId } });
    });

    return { message: 'Gasto eliminado correctamente' };
  }
}

export default new BudgetService();
