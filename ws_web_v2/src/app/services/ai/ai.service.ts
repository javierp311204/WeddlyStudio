import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

  chat(weddingId: string, message: string, history: ChatMessage[]): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/ai/${weddingId}/chat`,
      { message, history }
    );
  }

  suggestTasks(weddingId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/ai/${weddingId}/suggest-tasks`,
      {}
    );
  }

  suggestSeating(weddingId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/ai/${weddingId}/suggest-seating`,
      {}
    );
  }

  suggestTableForGuest(weddingId: string, guestId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/ai/${weddingId}/suggest-table/${guestId}`,
      {}
    );
  }

  getUsage(weddingId: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/ai/${weddingId}/usage`
    );
  }
}