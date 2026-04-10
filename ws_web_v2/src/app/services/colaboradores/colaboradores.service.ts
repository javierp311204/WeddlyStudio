import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

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

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getMembers(weddingId: string): Observable<Member[]> {
    return this.http
      .get<any>(`${this.apiUrl}/weddings/${weddingId}/members`)
      .pipe(map(r => r?.data ?? r));
  }

  getInvites(weddingId: string): Observable<Invite[]> {
    return this.http
      .get<any>(`${this.apiUrl}/weddings/${weddingId}/invites`)
      .pipe(map(r => r?.data ?? r));
  }

  sendInvite(weddingId: string, email: string, role: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/weddings/${weddingId}/invites`,
      { email, role }
    );
  }

  revokeInvite(weddingId: string, inviteId: string): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/weddings/${weddingId}/invites/${inviteId}`
    );
  }

  revokeMember(weddingId: string, memberId: string): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/weddings/${weddingId}/members/${memberId}`
    );
  }

  updateMemberRole(weddingId: string, memberId: string, role: string): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/weddings/${weddingId}/members/${memberId}/role`,
      { role }
    );
  }
}