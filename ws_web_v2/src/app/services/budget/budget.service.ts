import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Budget,
  BudgetCreatePayload,
  Expense,
  ExpenseCreatePayload,
  ExpenseUpdatePayload,
} from '../../models/budget.model';

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getBudgets(): Observable<{ success: boolean; data: Budget[] }> {
    return this.http.get<{ success: boolean; data: Budget[] }>(`${this.apiUrl}/budgets`, { withCredentials: true });
  }

  getBudget(id: string): Observable<{ success: boolean; data: Budget }> {
    return this.http.get<{ success: boolean; data: Budget }>(`${this.apiUrl}/budgets/${id}`, { withCredentials: true });
  }

  createBudget(payload: BudgetCreatePayload): Observable<{ success: boolean; data: Budget }> {
    return this.http.post<{ success: boolean; data: Budget }>(`${this.apiUrl}/budgets`, payload, { withCredentials: true });
  }

  updateBudget(id: string, payload: Partial<BudgetCreatePayload>): Observable<{ success: boolean; data: Budget }> {
    return this.http.put<{ success: boolean; data: Budget }>(`${this.apiUrl}/budgets/${id}`, payload, { withCredentials: true });
  }

  createExpense(payload: ExpenseCreatePayload): Observable<{ success: boolean; data: Expense }> {
    return this.http.post<{ success: boolean; data: Expense }>(`${this.apiUrl}/expenses`, payload, { withCredentials: true });
  }

  updateExpense(id: string, payload: ExpenseUpdatePayload): Observable<{ success: boolean; data: Expense }> {
    return this.http.put<{ success: boolean; data: Expense }>(`${this.apiUrl}/expenses/${id}`, payload, { withCredentials: true });
  }

  deleteExpense(id: string): Observable<{ success: boolean; data: any }> {
    return this.http.delete<{ success: boolean; data: any }>(`${this.apiUrl}/expenses/${id}`, { withCredentials: true });
  }
}
