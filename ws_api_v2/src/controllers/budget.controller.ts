import { Request, Response, NextFunction } from 'express';
import budgetService from '../services/budget.service';

export class BudgetController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await budgetService.getAll(req.user!.userId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await budgetService.create(req.body, req.user!.userId);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await budgetService.getById(req.params.id, req.user!.userId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await budgetService.update(req.params.id, req.user!.userId, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await budgetService.remove(req.params.id, req.user!.userId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await budgetService.getCategories(req.params.id, req.user!.userId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async createExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await budgetService.createExpense(req.body, req.user!.userId);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async updateExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await budgetService.updateExpense(req.params.id, req.user!.userId, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async removeExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await budgetService.removeExpense(req.params.id, req.user!.userId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export default new BudgetController();
