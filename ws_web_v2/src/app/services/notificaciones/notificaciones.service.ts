// src/app/services/notificaciones/notificaciones.service.ts
// ⚠️ ESTE SERVICIO NO TIENE EQUIVALENTE EN EL NUEVO BACKEND (API v2)
//
// El backend viejo tenía un módulo /api/notificaciones propio.
// El backend nuevo (API v2) no implementó notificaciones todavía.
//
// OPCIONES:
// A) Mantener el servicio apuntando al backend viejo mientras se implementa (no recomendado)
// B) Comentar o eliminar las llamadas a este servicio temporalmente
// C) Implementar el módulo de notificaciones en el backend nuevo (pendiente)
//
// Por ahora se deja el servicio con métodos stub que no hacen nada,
// para evitar errores de compilación en componentes que lo inyectan.

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NotificacionesService {

  /** @deprecated Pendiente de implementar en API v2 */
  getNotificaciones(_usuario: string, _codigoBoda: string, _tipoUsuario = 'invitado'): Observable<any[]> {
    console.warn('[NotificacionesService] Módulo no implementado en API v2');
    return of([]);
  }

  /** @deprecated Pendiente de implementar en API v2 */
  marcarComoLeida(_id: string): Observable<any> {
    return of(null);
  }

  /** @deprecated Pendiente de implementar en API v2 */
  crearNotificacion(_datos: any): Observable<any> {
    return of(null);
  }

  /** @deprecated Pendiente de implementar en API v2 */
  eliminarNotificacion(_id: string): Observable<any> {
    return of(null);
  }

  /** @deprecated Pendiente de implementar en API v2 */
  limpiarLeidas(_usuario: string, _codigoBoda: string): Observable<any> {
    return of(null);
  }

  /** @deprecated Pendiente de implementar en API v2 */
  marcarTodasComoLeidas(_usuario: string, _codigoBoda: string): Observable<any> {
    return of(null);
  }
}