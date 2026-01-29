import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Posicion {
  x: number;
  y: number;
}

export interface Mesa {
  _id: string;
  nombre: string;
  tipo: string;
  capacidad: number;
  posicion: Posicion;
  radio: number;
  asientos: Asiento[];
}

export interface Asiento {
  posicion: number; 
  invitado_id?: string;
  ocupado: boolean;
  invitado?: {
    _id?: string;
    nombre: string;
    tipo: string;
    alergias: string;
    confirmado: boolean;
  };
}

@Injectable({ providedIn: 'root' })
export class PlanoService {
  private apiUrl = 'http://localhost:3000/api/plano';

  constructor(private http: HttpClient) {}

  private getHeaders() {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`
      })
    };
  }

  // Obtener plano completo
  getPlano(codigoBoda: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${codigoBoda}`, this.getHeaders());
  }

  // Actualizar posición de mesa (drag & drop)
  actualizarPosicionMesa(mesaId: string, x: number, y: number, codigoBoda: string): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/mesa/${mesaId}/posicion`,
      { codigoBoda, x, y },
      this.getHeaders()
    );
  }

  // Asignar invitado a mesa
  asignarInvitadoAMesa(mesaId: string, invitadoId: string, codigoBoda: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/asignar-invitado`,
      { codigoBoda, mesaId, invitadoId },
      this.getHeaders()
    );
  }

  // Quitar invitado de mesa
  quitarInvitadoDeMesa(mesaId: string, invitadoId: string, codigoBoda: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/quitar-invitado`,
      { codigoBoda, mesaId, invitadoId },
      this.getHeaders()
    );
  }

  // Agregar nueva mesa
  agregarMesa(datos: any): Observable<any> {
    const mesaConPosicion = {
      ...datos,
      posicion: { x: 50, y: 50 } 
    };
    return this.http.post(`${this.apiUrl}/nueva-mesa`, mesaConPosicion, this.getHeaders());
  }

  // Eliminar mesa
  eliminarMesa(mesaId: string, codigoBoda: string): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/mesa/${mesaId}?codigoBoda=${codigoBoda}`,
      this.getHeaders()
    );
  }
}