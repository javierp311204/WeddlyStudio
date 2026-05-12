export interface BudgetCategory {
  id: string;
  name: string;
  allocatedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  expenses?: Expense[];
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string;
  notes?: string;
  categoryId: string;
}

export interface Budget {
  id: string;
  name: string;
  currency: string;
  totalBudget: number;
  guests: number;
  weddingDate: string;
  createdAt: string;
  categories: BudgetCategory[];
  totalSpent: number;
  remainingAmount: number;
}

export interface BudgetCreatePayload {
  name: string;
  totalBudget: number;
  currency: string;
  guests: number;
  weddingDate: string;
}

export interface ExpenseCreatePayload {
  title: string;
  amount: number;
  categoryId: string;
  date: string;
  notes?: string;
}

export interface ExpenseUpdatePayload {
  title?: string;
  amount?: number;
  categoryId?: string;
  date?: string;
  notes?: string;
}
