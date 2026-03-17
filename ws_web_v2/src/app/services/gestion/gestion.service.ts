// src/app/services/gestion/gestion.service.ts
// Actualizado para Weddly API v2
//
// CAMBIOS PRINCIPALES vs backend viejo:
// - /api/gestion/detalles/:codigo  → /api/weddings/:weddingId
// - /api/gestion/invitados         → /api/weddings/:weddingId/guests
// - /api/gestion/mesas             → /api/weddings/:weddingId/tables
// - codigoBoda (string)            → weddingId (UUID)

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface WeddingPayload {
  name:              string;
  wedding_date:      string;   // ISO string
  location_name?:    string;
  address?:          string;
  dress_code?:       string;
  menu_description?: string;
  rsvp_deadline?:    string;
}

export interface GuestPayload {
  first_name:     string;
  last_name?:     string;
  email?:         string;
  phone?:         string;
  allergies?:     string;
  dietary_notes?: string;
}

export interface TablePayload {
  name:          string;
  shape?:        'round' | 'rectangular';
  max_capacity?: number;
  pos_x?:        number;
  pos_y?:        number;
}

@Injectable({ providedIn: 'root' })
export class GestionService {
  private apiUrl = 'https://weddly-api-production.up.railway.app/api';

  constructor(private http: HttpClient) {}

  // ════════════════════════════════════════
  // BODAS
  // ════════════════════════════════════════

  /** Lista todas las bodas del usuario autenticado */
  getMisBodas(): Observable<any> {
    return this.http.get(`${this.apiUrl}/weddings`);
  }

  /** Detalle de una boda con sus miembros y contadores */
  getConfiguracion(weddingId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/weddings/${weddingId}`);
  }

  /** Crear nueva boda */
  crearBoda(datos: WeddingPayload): Observable<any> {
    return this.http.post(`${this.apiUrl}/weddings`, datos);
  }

  /** Actualizar datos de la boda */
  postConfiguracion(weddingId: string, datos: Partial<WeddingPayload>): Observable<any> {
    return this.http.patch(`${this.apiUrl}/weddings/${weddingId}`, datos);
  }

  /** Eliminar boda (soft delete) */
  deleteBoda(weddingId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/weddings/${weddingId}`);
  }

  // ════════════════════════════════════════
  // INVITADOS
  // ════════════════════════════════════════

  /**
   * Obtener invitados de una boda.
   * Filtros opcionales: rsvp_status, search, table_id
   */
  getInvitados(
    weddingId: string,
    busqueda:  string = '',
    rsvpStatus: string = '',
  ): Observable<any> {
    let url = `${this.apiUrl}/weddings/${weddingId}/guests?`;
    if (busqueda)   url += `search=${busqueda}&`;
    if (rsvpStatus && rsvpStatus !== 'Todos') url += `rsvp_status=${rsvpStatus.toLowerCase()}&`;
    return this.http.get(url);
  }

  /** Agregar invitado principal */
  postInvitado(weddingId: string, invitado: GuestPayload): Observable<any> {
    return this.http.post(`${this.apiUrl}/weddings/${weddingId}/guests`, invitado);
  }

  /** Agregar acompañante (+1) a un invitado principal */
  postCompanion(weddingId: string, guestId: string, companion: GuestPayload): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/weddings/${weddingId}/guests/${guestId}/companions`,
      companion,
    );
  }

  /** Actualizar datos de un invitado */
  updateInvitado(guestId: string, datos: Partial<GuestPayload>): Observable<any> {
    return this.http.patch(`${this.apiUrl}/guests/${guestId}`, datos);
  }

  /** Cambiar estado RSVP de un invitado (uso interno/admin) */
  updateRsvp(guestId: string, rsvp_status: 'pending' | 'confirmed' | 'declined'): Observable<any> {
    return this.http.patch(`${this.apiUrl}/guests/${guestId}/rsvp`, { rsvp_status });
  }

  /** Eliminar invitado (soft delete + cascade a companions) */
  deleteInvitado(guestId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/guests/${guestId}`);
  }

  // ════════════════════════════════════════
  // MESAS
  // ════════════════════════════════════════

  /** Listar mesas de una boda con campos calculados (occupied, available, is_full) */
  getMesas(weddingId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/weddings/${weddingId}/tables`);
  }

  /** Crear mesa */
  postMesa(weddingId: string, mesa: TablePayload): Observable<any> {
    return this.http.post(`${this.apiUrl}/weddings/${weddingId}/tables`, mesa);
  }

  /** Actualizar mesa */
  updateMesa(tableId: string, datos: Partial<TablePayload>): Observable<any> {
    return this.http.patch(`${this.apiUrl}/tables/${tableId}`, datos);
  }

  /** Asignar invitado a mesa */
  asignarInvitado(tableId: string, guestId: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/tables/${tableId}/assign`, { guest_id: guestId });
  }

  /** Quitar invitado de mesa */
  quitarInvitado(tableId: string, guestId: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/tables/${tableId}/unassign/${guestId}`, {});
  }

  /** Eliminar mesa (borrado físico — devuelve guests_released) */
  deleteMesa(tableId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/tables/${tableId}`);
  }

  // ════════════════════════════════════════
  // MIEMBROS DE LA BODA
  // ════════════════════════════════════════

  /** Añadir miembro con rol */
  addMember(weddingId: string, userId: string, role: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/weddings/${weddingId}/members`, { user_id: userId, role });
  }

  /** Eliminar miembro */
  removeMember(weddingId: string, userId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/weddings/${weddingId}/members/${userId}`);
  }
}