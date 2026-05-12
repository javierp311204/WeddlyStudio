import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { BudgetService } from '../../services/budget/budget.service';
import { Budget, Expense } from '../../models/budget.model';

@Component({
  selector: 'app-budget-planner',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BaseChartDirective],
  providers: [provideCharts(withDefaultRegisterables())],
  templateUrl: './budget-planner.component.html',
  styleUrls: ['./budget-planner.component.css'],
})
export class BudgetPlannerComponent implements OnInit {
  budgets: Budget[] = [];
  selectedBudget?: Budget;
  loading = true;
  savingBudget = false;
  savingExpense = false;
  errorMessage = '';
  alerts: string[] = [];
  editingExpense?: Expense | null = null;

  budgetForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    totalBudget: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    currency: new FormControl('EUR', [Validators.required, Validators.maxLength(10)]),
    guests: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    weddingDate: new FormControl('', [Validators.required]),
  });

  expenseForm = new FormGroup({
    title: new FormControl('', [Validators.required, Validators.maxLength(255)]),
    amount: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    categoryId: new FormControl('', [Validators.required]),
    date: new FormControl('', [Validators.required]),
    notes: new FormControl(''),
  });

  constructor(private budgetService: BudgetService) {}

  ngOnInit(): void {
    this.loadBudgets();
  }

  private loadBudgets(): void {
    this.loading = true;
    this.budgetService.getBudgets().subscribe({
      next: (res) => {
        this.budgets = res.data;
        if (this.budgets.length > 0) {
          this.selectBudget(this.budgets[0].id);
        } else {
          this.selectedBudget = undefined;
          this.buildAlerts();
        }
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'No se pudo cargar el presupuesto';
        this.loading = false;
      },
    });
  }

  selectBudget(id: string): void {
    this.loading = true;
    this.budgetService.getBudget(id).subscribe({
      next: (res) => {
        this.selectedBudget = res.data;
        this.errorMessage = '';
        this.populateBudgetForm();
        this.resetExpenseForm();
        this.buildAlerts();
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'No se pudo cargar el presupuesto';
        this.loading = false;
      },
    });
  }

  private populateBudgetForm(): void {
    if (!this.selectedBudget) return;
    this.budgetForm.setValue({
      name: this.selectedBudget.name,
      totalBudget: this.selectedBudget.totalBudget,
      currency: this.selectedBudget.currency,
      guests: this.selectedBudget.guests,
      weddingDate: this.selectedBudget.weddingDate.substring(0, 10),
    });
  }

  createBudget(): void {
    if (this.budgetForm.invalid) {
      this.budgetForm.markAllAsTouched();
      return;
    }

    this.savingBudget = true;
    const payload = {
      ...this.budgetForm.value,
      weddingDate: new Date(this.budgetForm.value.weddingDate!).toISOString(),
    } as any;

    this.budgetService.createBudget(payload).subscribe({
      next: () => {
        this.loadBudgets();
        this.savingBudget = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'No se pudo crear el presupuesto';
        this.savingBudget = false;
      },
    });
  }

  saveBudget(): void {
    if (!this.selectedBudget || this.budgetForm.invalid) {
      this.budgetForm.markAllAsTouched();
      return;
    }

    this.savingBudget = true;
    const payload = {
      ...this.budgetForm.value,
      weddingDate: new Date(this.budgetForm.value.weddingDate!).toISOString(),
    } as any;

    this.budgetService.updateBudget(this.selectedBudget.id, payload).subscribe({
      next: (res) => {
        this.selectedBudget = res.data;
        this.buildAlerts();
        this.savingBudget = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'No se pudo actualizar el presupuesto';
        this.savingBudget = false;
      },
    });
  }

  submitExpense(): void {
    if (!this.selectedBudget || this.expenseForm.invalid) {
      this.expenseForm.markAllAsTouched();
      return;
    }

    this.savingExpense = true;
    const payload = {
      ...this.expenseForm.value,
      date: new Date(this.expenseForm.value.date!).toISOString(),
    } as any;

    const request$ = this.editingExpense
      ? this.budgetService.updateExpense(this.editingExpense.id, payload)
      : this.budgetService.createExpense(payload);

    request$.subscribe({
      next: () => {
        this.selectBudget(this.selectedBudget!.id);
        this.editingExpense = null;
        this.savingExpense = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'No se pudo guardar el gasto';
        this.savingExpense = false;
      },
    });
  }

  editExpense(expense: Expense): void {
    this.editingExpense = expense;
    this.expenseForm.setValue({
      title: expense.title,
      amount: expense.amount,
      categoryId: expense.categoryId,
      date: expense.date.substring(0, 10),
      notes: expense.notes || '',
    });
  }

  cancelEdit(): void {
    this.editingExpense = null;
    this.resetExpenseForm();
  }

  deleteExpense(expense: Expense): void {
    const confirmed = window.confirm('¿Eliminar este gasto? Esta acción no se puede deshacer.');
    if (!confirmed) return;
    this.savingExpense = true;

    this.budgetService.deleteExpense(expense.id).subscribe({
      next: () => {
        this.selectBudget(this.selectedBudget!.id);
        this.savingExpense = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'No se pudo eliminar el gasto';
        this.savingExpense = false;
      },
    });
  }

  private resetExpenseForm(): void {
    this.expenseForm.reset({
      title: '',
      amount: null,
      categoryId: this.selectedBudget?.categories[0]?.id || '',
      date: new Date().toISOString().substring(0, 10),
      notes: '',
    });
  }

  private buildAlerts(): void {
    this.alerts = [];
    if (!this.selectedBudget) return;

    const usedPercent = Math.round((this.selectedBudget.totalSpent / this.selectedBudget.totalBudget) * 100);
    if (usedPercent >= 80) {
      this.alerts.push(`⚠️ ${usedPercent}% of total budget already used`);
    }

    if (this.selectedBudget.remainingAmount <= this.selectedBudget.totalBudget * 0.1) {
      this.alerts.push('⚠️ You are close to running out of budget');
    }

    this.selectedBudget.categories.forEach((category) => {
      if (category.spentAmount > category.allocatedAmount) {
        this.alerts.push(`⚠️ You exceeded the ${category.name} budget`);
      }
    });
  }

  get doughnutLabels(): string[] {
    return this.selectedBudget?.categories.map((category) => category.name) || [];
  }

  get doughnutData(): number[] {
    return this.selectedBudget?.categories.map((category) => category.spentAmount) || [];
  }

  get barLabels(): string[] {
    return this.selectedBudget?.categories.map((category) => category.name) || [];
  }

  get barExpenses(): number[] {
    return this.selectedBudget?.categories.map((category) => category.spentAmount) || [];
  }

  get barAllocated(): number[] {
    return this.selectedBudget?.categories.map((category) => category.allocatedAmount) || [];
  }

  get costPerGuest(): number {
    if (!this.selectedBudget || !this.selectedBudget.guests) return 0;
    return Number((this.selectedBudget.totalSpent / this.selectedBudget.guests).toFixed(2));
  }

  get estimatedFinal(): number {
    return this.selectedBudget?.totalSpent ?? 0;
  }

  get averageCategory(): string {
    if (!this.selectedBudget || this.selectedBudget.categories.length === 0) return '0';
    const average = this.selectedBudget.totalSpent / this.selectedBudget.categories.length;
    return average.toFixed(2);
  }

  get categoryOptions() {
    return this.selectedBudget?.categories || [];
  }
}
