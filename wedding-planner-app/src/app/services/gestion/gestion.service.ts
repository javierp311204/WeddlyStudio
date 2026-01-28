import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class GestionService {
  private apiUrl = 'http://localhost:3000/api/gestion';

  constructor(private http: HttpClient) {}

  // Headers con Token para eliminar el error 401 (Unauthorized)
  private getHeaders() {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
      }),
    };
  }

  // --- CONFIGURACIÓN (DETALLES) ---
  // Obtener la info general (lugar, fecha, etc.)
  getConfiguracion(codigo: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/detalles/${codigo}`,
      this.getHeaders(),
    );
  }

  // Guardar o actualizar la info general (upsert)
  postConfiguracion(datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/detalles`, datos, this.getHeaders());
  }

  // --- INVITADOS ---
  // Obtener la lista filtrada de invitados
  getInvitados(
    codigoBoda: string,
    busqueda: string = '',
    tipo: string = 'Todos',
  ): Observable<any[]> {
    const url = `${this.apiUrl}/invitados?codigoBoda=${codigoBoda}&busqueda=${busqueda}&tipo=${tipo}`;
    return this.http.get<any[]>(url, this.getHeaders());
  }

  // Agregar invitado al array
  postInvitado(invitado: any): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/invitados`,
      invitado,
      this.getHeaders(),
    );
  }

  updateInvitado(id: string, datos: any) {
    // Agregar los headers con el token
    return this.http.put(
      `${this.apiUrl}/invitados/${id}`,
      datos,
      this.getHeaders(),
    );
  }

  // Eliminar invitado del array
  deleteInvitado(id: string, codigoBoda: string): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/invitados/${id}?codigoBoda=${codigoBoda}`,
      this.getHeaders(),
    );
  }

  // --- MESAS ---
  // Agregar mesa al array (Resuelve el error "postMesa does not exist")
  postMesa(mesa: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/mesas`, mesa, this.getHeaders());
  }

  // Eliminar mesa del array
  deleteMesa(id: string, codigoBoda: string): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/mesas/${id}?codigoBoda=${codigoBoda}`,
      this.getHeaders(),
    );
  }
}
