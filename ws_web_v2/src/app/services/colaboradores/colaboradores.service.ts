import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const API = 'https://weddly-api-production.up.railway.app/api';

export interface Member {
  id:          string;   
  role:        string;
  assigned_at: string;
  user: {
    id:         string;
    first_name: string;
    last_name:  string;
    email:      string;
    avatar_url: string | null;
  };
}

export interface Invite {
  id:          string;
  email:       string;
  role:        string;
  expires_at:  string;
  accepted_at: string | null;
  declined_at: string | null;
  created_at:  string;
}

@Injectable({ providedIn: 'root' })
export class ColaboradoresService {

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('token')}` });
  }

  getMembers(weddingId: string): Observable<Member[]> {
    return this.http
      .get<any>(`${API}/weddings/${weddingId}/members`, { headers: this.headers() })
      .pipe(map(r => r?.data ?? r));
  }

  getInvites(weddingId: string): Observable<Invite[]> {
    return this.http
      .get<any>(`${API}/weddings/${weddingId}/invites`, { headers: this.headers() })
      .pipe(map(r => r?.data ?? r));
  }

  sendInvite(weddingId: string, email: string, role: string): Observable<any> {
    return this.http.post(
      `${API}/weddings/${weddingId}/invites`,
      { email, role },
      { headers: this.headers() },
    );
  }

  revokeInvite(weddingId: string, inviteId: string): Observable<any> {
    return this.http.delete(
      `${API}/weddings/${weddingId}/invites/${inviteId}`,
      { headers: this.headers() },
    );
  }

  revokeMember(weddingId: string, memberId: string): Observable<any> {
    return this.http.delete(
      `${API}/weddings/${weddingId}/members/${memberId}`,
      { headers: this.headers() },
    );
  }

  updateMemberRole(weddingId: string, memberId: string, role: string): Observable<any> {
    return this.http.patch(
      `${API}/weddings/${weddingId}/members/${memberId}/role`,
      { role },
      { headers: this.headers() },
    );
  }
}