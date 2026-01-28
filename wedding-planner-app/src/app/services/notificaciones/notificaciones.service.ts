import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificacionesService {
  private apiUrl = 'http://localhost:3000/api/notificaciones';

  constructor(private http: HttpClient) {}

  // Obtener las notificaciones del usuario
  getNotificaciones(usuario: string, codigoBoda: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${usuario}?codigoBoda=${codigoBoda}`);
  }

  // Marcar como leída
  marcarComoLeida(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/leer/${id}`, {});
  }
}