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

  getPlano(codigoBoda: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${codigoBoda}`, this.getHeaders());
  }

  actualizarPosicionMesa(mesaId: string, x: number, y: number, codigoBoda: string): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/mesa/${mesaId}/posicion`,
      { codigoBoda, x, y },
      this.getHeaders()
    );
  }

  sentarInvitado(mesaId: string, invitadoId: string, posicion: number, codigoBoda: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/mesa/${mesaId}/asiento`,
      { codigoBoda, invitadoId, posicion },
      this.getHeaders()
    );
  }

  agregarMesa(datos: any): Observable<any> {
    const mesaConPosicion = {
    ...datos,
    posicion: { x: 50, y: 50 } 
  };
  return this.http.post(`http://localhost:3000/api/gestion/mesas`, mesaConPosicion, this.getHeaders());
}
}