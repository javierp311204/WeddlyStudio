import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../enviroments/enviroment';

export interface Review {
  id:         string;
  rating:     number;
  comment:    string;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
  user?: {
    first_name: string;
    last_name:  string;
    nickname:   string | null;
    avatar_url: string | null;
  };
}

export interface ReviewsResponse {
  reviews: Review[];
  total:   number;
  average: number;
}

@Injectable({ providedIn: 'root' })
export class ReviewsService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(): { headers: HttpHeaders } {
    const token = localStorage.getItem('token') ?? '';
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  getAll(order: 'created_at' | 'rating' = 'created_at'): Observable<any> {
    return this.http.get(`${this.apiUrl}/reviews?order=${order}`);
  }

  getMine(): Observable<any> {
    return this.http.get(`${this.apiUrl}/reviews/me`, this.getHeaders());
  }

  create(rating: number, comment: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reviews`, { rating, comment }, this.getHeaders());
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/reviews/${id}`, this.getHeaders());
  }
}