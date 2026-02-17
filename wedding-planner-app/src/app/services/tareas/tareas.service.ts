// src/app/services/tareas/tareas.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Tarea } from '../../models/Tarea';

export interface Checklist {
  _id?: string;
  codigoBoda: string;
  creadoPor: string;
  tareas: Tarea[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EstadisticasChecklist {
  total: number;
  completadas: number;
  enProgreso: number;
  pendientes: number;
  porcentajeTotal: number;
  porFase: {
    fase: string;
    total: number;
    completadas: number;
    porcentaje: number;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class TareasService {
  private apiUrl = 'http://localhost:3000/api/checklist';

  constructor(private http: HttpClient) {}

  private getHeaders() {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`
      })
    };
  }

  // ============================================
  // CHECKLIST COMPLETO
  // ============================================

  /**
   * Obtiene el checklist completo de una boda (con todas sus tareas)
   */
  getChecklist(codigoBoda: string): Observable<Checklist> {
    return this.http.get<Checklist>(
      `${this.apiUrl}/${codigoBoda}`,
      this.getHeaders()
    );
  }

  /**
   * Verifica si ya existe un checklist para esta boda
   */
  verificarChecklist(codigoBoda: string): Observable<{ existe: boolean; cantidad: number }> {
    return this.http.get<{ existe: boolean; cantidad: number }>(
      `${this.apiUrl}/${codigoBoda}/verificar`,
      this.getHeaders()
    );
  }

  /**
   * Inicializa el checklist con las tareas predefinidas por fase
   */
  inicializarChecklist(codigoBoda: string): Observable<{ mensaje: string; cantidad: number }> {
    return this.http.post<{ mensaje: string; cantidad: number }>(
      `${this.apiUrl}/inicializar`,
      { codigoBoda },
      this.getHeaders()
    );
  }

  // ============================================
  // TAREAS POR FASE
  // ============================================

  /**
   * Obtiene las tareas filtradas por fase
   */
  getTareasByFase(codigoBoda: string, fase: string): Observable<Tarea[]> {
    return this.http.get<Tarea[]>(
      `${this.apiUrl}/${codigoBoda}/fase/${fase}`,
      this.getHeaders()
    );
  }

  // ============================================
  // CRUD DE TAREAS INDIVIDUALES
  // ============================================

  /**
   * Agrega una nueva tarea al checklist de la boda
   */
  crearTarea(codigoBoda: string, tarea: Partial<Tarea>): Observable<Tarea> {
    return this.http.post<Tarea>(
      `${this.apiUrl}/${codigoBoda}/tarea`,
      tarea,
      this.getHeaders()
    );
  }

  /**
   * Actualiza todos los campos de una tarea
   */
  actualizarTarea(codigoBoda: string, tareaId: string, tarea: Partial<Tarea>): Observable<Tarea> {
    return this.http.put<Tarea>(
      `${this.apiUrl}/${codigoBoda}/tarea/${tareaId}`,
      tarea,
      this.getHeaders()
    );
  }

  /**
   * Cambia el estado de una tarea (pendiente | en_progreso | completada)
   */
  cambiarEstado(
    codigoBoda: string,
    tareaId: string,
    estado: 'pendiente' | 'en_progreso' | 'completada'
  ): Observable<Tarea> {
    return this.http.patch<Tarea>(
      `${this.apiUrl}/${codigoBoda}/tarea/${tareaId}/estado`,
      { estado },
      this.getHeaders()
    );
  }

  /**
   * Elimina una tarea del checklist
   */
  eliminarTarea(codigoBoda: string, tareaId: string): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(
      `${this.apiUrl}/${codigoBoda}/tarea/${tareaId}`,
      this.getHeaders()
    );
  }

  // ============================================
  // RECORDATORIOS
  // ============================================

  /**
   * Configura el recordatorio de una tarea
   */
  configurarRecordatorio(
    codigoBoda: string,
    tareaId: string,
    activo: boolean,
    diasAntes: number = 3
  ): Observable<Tarea> {
    return this.http.patch<Tarea>(
      `${this.apiUrl}/${codigoBoda}/tarea/${tareaId}/recordatorio`,
      { activo, diasAntes },
      this.getHeaders()
    );
  }

  /**
   * Obtiene las tareas con recordatorios activos y no enviados
   */
  getRecordatoriosPendientes(codigoBoda: string): Observable<Tarea[]> {
    return this.http.get<Tarea[]>(
      `${this.apiUrl}/${codigoBoda}/recordatorios`,
      this.getHeaders()
    );
  }

  // ============================================
  // ESTADÍSTICAS
  // ============================================

  /**
   * Obtiene estadísticas generales y por fase del checklist
   */
  getEstadisticas(codigoBoda: string): Observable<EstadisticasChecklist> {
    return this.http.get<EstadisticasChecklist>(
      `${this.apiUrl}/${codigoBoda}/estadisticas`,
      this.getHeaders()
    );
  }
}