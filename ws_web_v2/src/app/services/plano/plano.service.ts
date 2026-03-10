import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../enviroments/enviroment';

export interface TablePosition {
  pos_x: number;
  pos_y: number;
}

export interface GuestSummary {
  id:              string;
  first_name:      string;
  last_name:       string | null;
  group:           string | null;   
  rsvp_status:     'pending' | 'confirmed' | 'declined';
  seat_number:     number | null;
  parent_guest_id: string | null;
  allergies?:      string | null;
  email?:          string | null;
  table_id?:       string | null;
}

export interface Table {
  id:           string;
  wedding_id:   string;
  name:         string;
  shape:        'round' | 'rectangular';
  max_capacity: number;
  pos_x:        number;
  pos_y:        number;
  occupied:     number;
  available:    number;
  is_full:      boolean;
  guests?:      GuestSummary[];
}

export interface TableSummary {
  total_tables:    number;
  total_capacity:  number;
  total_occupied:  number;
  total_available: number;
}

export interface TablesResponse {
  success:  boolean;
  data: {
    tables:  Table[];
    summary: TableSummary;
  };
}

export interface TablePayload {
  name:          string;
  shape?:        'round' | 'rectangular';
  max_capacity?: number;
  pos_x?:        number;
  pos_y?:        number;
}

@Injectable({ providedIn: 'root' })
export class PlanoService {
  // FIX: usar environment en lugar de URL hardcodeada
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // FIX: headers centralizados en el servicio — antes solo el componente los enviaba
  private getHeaders(): { headers: HttpHeaders } {
    const token = localStorage.getItem('token') ?? '';
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  // ════════════════════════════════════════
  // LECTURA
  // ════════════════════════════════════════

  getPlano(weddingId: string): Observable<TablesResponse> {
    return this.http.get<TablesResponse>(
      `${this.apiUrl}/weddings/${weddingId}/tables`,
      this.getHeaders(),
    );
  }

  getMesa(tableId: string): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/tables/${tableId}`,
      this.getHeaders(),
    );
  }

  // ════════════════════════════════════════
  // POSICIÓN (drag & drop)
  // ════════════════════════════════════════

  actualizarPosicionMesa(tableId: string, x: number, y: number): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/tables/${tableId}/position`,
      { pos_x: x, pos_y: y },
      this.getHeaders(),
    );
  }

  // ════════════════════════════════════════
  // ASIGNACIÓN DE INVITADOS
  // ════════════════════════════════════════

  asignarInvitadoAMesa(tableId: string, guestId: string): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/tables/${tableId}/assign`,
      { guest_id: guestId },
      this.getHeaders(),
    );
  }

  quitarInvitadoDeMesa(tableId: string, guestId: string): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/tables/${tableId}/unassign/${guestId}`,
      {},
      this.getHeaders(),
    );
  }

  // ════════════════════════════════════════
  // CRUD DE MESAS
  // ════════════════════════════════════════

  agregarMesa(weddingId: string, datos: TablePayload): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/weddings/${weddingId}/tables`,
      { pos_x: 600, pos_y: 400, ...datos },
      this.getHeaders(),
    );
  }

  actualizarMesa(tableId: string, datos: Partial<TablePayload>): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/tables/${tableId}`,
      datos,
      this.getHeaders(),
    );
  }

  eliminarMesa(tableId: string): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/tables/${tableId}`,
      this.getHeaders(),
    );
  }
}