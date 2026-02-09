import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificacionesService {
  private apiUrl = 'http://localhost:3000/api/notificaciones';

  constructor(private http: HttpClient) {}

  private getHeaders() {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`
      })
    };
  }

  // ✅ Actualizado: Obtener notificaciones con filtro de tipoUsuario
  getNotificaciones(usuario: string, codigoBoda: string, tipoUsuario: string = 'invitado'): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/${usuario}?codigoBoda=${codigoBoda}&tipoUsuario=${tipoUsuario}`,
      this.getHeaders()
    );
  }

  // Marcar como leída
  marcarComoLeida(id: string): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/leer/${id}`, 
      {}, 
      this.getHeaders()
    );
  }

  // ✅ Actualizado: Crear notificación con tipoUsuario
  crearNotificacion(datos: any): Observable<any> {
    // Asegurar que tipoUsuario esté incluido
    const datosCompletos = {
      ...datos,
      tipoUsuario: datos.tipoUsuario || 'invitado'
    };

    return this.http.post(
      `${this.apiUrl}/crear`,
      datosCompletos,
      this.getHeaders()
    );
  }

  // Eliminar notificación
  eliminarNotificacion(id: string): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/${id}`,
      this.getHeaders()
    );
  }

  // ✅ Actualizado: Limpiar notificaciones leídas con tipoUsuario
  limpiarLeidas(usuario: string, codigoBoda: string, tipoUsuario: string = 'invitado'): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/limpiar/${usuario}?codigoBoda=${codigoBoda}&tipoUsuario=${tipoUsuario}`,
      this.getHeaders()
    );
  }

  // ✅ Actualizado: Marcar todas como leídas con tipoUsuario
  marcarTodasComoLeidas(usuario: string, codigoBoda: string, tipoUsuario: string = 'invitado'): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/leer-todas/${usuario}?codigoBoda=${codigoBoda}&tipoUsuario=${tipoUsuario}`,
      {},
      this.getHeaders()
    );
  }
}