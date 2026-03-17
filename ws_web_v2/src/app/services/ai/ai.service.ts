import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ChatMessage {
  role:    'user' | 'assistant';
  content: string;
}

export interface UsageInfo {
  used:      number | null;
  limit:     number | null;
  unlimited: boolean;
  remaining: number | null;
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(): { headers: HttpHeaders } {
    const token = localStorage.getItem('token') ?? '';
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  // ── Chat general ──────────────────────────────────────────────
  chat(weddingId: string, message: string, history: ChatMessage[]): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/ai/${weddingId}/chat`,
      { message, history },
      this.getHeaders(),
    );
  }

  // ── Sugerir tareas para checklist ─────────────────────────────
  suggestTasks(weddingId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/ai/${weddingId}/suggest-tasks`,
      {},
      this.getHeaders(),
    );
  }

  // ── Sugerir distribución de mesas ─────────────────────────────
  suggestSeating(weddingId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/ai/${weddingId}/suggest-seating`,
      {},
      this.getHeaders(),
    );
  }

  // ── Sugerir mesa para un invitado ─────────────────────────────
  suggestTableForGuest(weddingId: string, guestId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/ai/${weddingId}/suggest-table/${guestId}`,
      {},
      this.getHeaders(),
    );
  }

  // ── Uso del mes actual ────────────────────────────────────────
  getUsage(weddingId: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/ai/${weddingId}/usage`,
      this.getHeaders(),
    );
  }
}