// src/app/services/plano/plano.service.ts
// Actualizado para Weddly API v2
//
// CAMBIOS PRINCIPALES vs backend viejo:
// - /api/plano/:codigoBoda              → /api/weddings/:weddingId/tables
// - /api/plano/mesa/:id/posicion        → /api/tables/:tableId/position
// - /api/plano/asignar-invitado         → /api/tables/:tableId/assign
// - /api/plano/quitar-invitado          → /api/tables/:tableId/unassign/:guestId
// - /api/plano/nueva-mesa               → /api/weddings/:weddingId/tables
// - /api/plano/mesa/:id?codigoBoda=     → /api/tables/:tableId
// - Mesa._id                            → Table.id (UUID)
// - Posicion { x, y }                  → pos_x, pos_y (campos directos)
// - tipo (string)                       → shape: 'round' | 'rectangular'

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TablePosition {
  pos_x: number;
  pos_y: number;
}

export interface Table {
  id:           string;       // UUID — antes: _id
  wedding_id:   string;
  name:         string;       // antes: nombre
  shape:        'round' | 'rectangular'; // antes: tipo
  max_capacity: number;       // antes: capacidad
  pos_x:        number;       // antes: posicion.x
  pos_y:        number;       // antes: posicion.y
  occupied:     number;       // campo calculado
  available:    number;       // campo calculado
  is_full:      boolean;      // campo calculado
  guests?:      any[];
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
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  // ════════════════════════════════════════
  // LECTURA
  // ════════════════════════════════════════

  /**
   * Obtiene todas las mesas de la boda con campos calculados.
   * Antes: GET /api/plano/:codigoBoda
   */
  getPlano(weddingId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/weddings/${weddingId}/tables`);
  }

  /**
   * Detalle de una mesa con invitados asignados.
   */
  getMesa(tableId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/tables/${tableId}`);
  }

  // ════════════════════════════════════════
  // POSICIÓN (drag & drop)
  // ════════════════════════════════════════

  /**
   * Actualiza solo la posición de una mesa.
   * Antes: PATCH /api/plano/mesa/:mesaId/posicion  con { codigoBoda, x, y }
   * Ahora: PATCH /api/tables/:tableId/position     con { pos_x, pos_y }
   */
  actualizarPosicionMesa(tableId: string, x: number, y: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/tables/${tableId}/position`, {
      pos_x: x,
      pos_y: y,
    });
  }

  // ════════════════════════════════════════
  // ASIGNACIÓN DE INVITADOS
  // ════════════════════════════════════════

  /**
   * Asigna un invitado a una mesa. Valida capacidad en transacción.
   * Antes: POST /api/plano/asignar-invitado  con { codigoBoda, mesaId, invitadoId }
   * Ahora: PATCH /api/tables/:tableId/assign con { guest_id }
   */
  asignarInvitadoAMesa(tableId: string, guestId: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/tables/${tableId}/assign`, {
      guest_id: guestId,
    });
  }

  /**
   * Quita un invitado de su mesa.
   * Antes: POST /api/plano/quitar-invitado    con { codigoBoda, mesaId, invitadoId }
   * Ahora: PATCH /api/tables/:tableId/unassign/:guestId
   */
  quitarInvitadoDeMesa(tableId: string, guestId: string): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/tables/${tableId}/unassign/${guestId}`,
      {},
    );
  }

  // ════════════════════════════════════════
  // CRUD DE MESAS
  // ════════════════════════════════════════

  /**
   * Crea una nueva mesa.
   * Antes: POST /api/plano/nueva-mesa  con posicion: { x, y }
   * Ahora: POST /api/weddings/:weddingId/tables  con pos_x, pos_y
   */
  agregarMesa(weddingId: string, datos: TablePayload): Observable<any> {
    return this.http.post(`${this.apiUrl}/weddings/${weddingId}/tables`, {
      ...datos,
      pos_x: datos.pos_x ?? 50,
      pos_y: datos.pos_y ?? 50,
    });
  }

  /**
   * Actualiza nombre, shape o capacidad de una mesa.
   */
  actualizarMesa(tableId: string, datos: Partial<TablePayload>): Observable<any> {
    return this.http.patch(`${this.apiUrl}/tables/${tableId}`, datos);
  }

  /**
   * Elimina una mesa físicamente y desasigna sus invitados.
   * Devuelve { guests_released: N }
   * Antes: DELETE /api/plano/mesa/:mesaId?codigoBoda=
   * Ahora: DELETE /api/tables/:tableId
   */
  eliminarMesa(tableId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/tables/${tableId}`);
  }
}