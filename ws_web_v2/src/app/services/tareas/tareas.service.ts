// src/app/services/tareas/tareas.service.ts
// Actualizado para Weddly API v2
//
// CAMBIOS PRINCIPALES vs backend viejo:
// - /api/checklist/:codigoBoda         → /api/weddings/:weddingId/tasks
// - /api/checklist/inicializar         → /api/weddings/:weddingId/tasks/initialize
// - /api/checklist/:cod/fase/:fase     → /api/weddings/:weddingId/tasks?phase=:fase
// - estado 'pendiente'   → 'pending'
// - estado 'en_progreso' → 'in_progress'
// - estado 'completada'  → 'completed'
// - _id                  → id (UUID)
// - titulo               → title
// - Las funciones de recordatorio NO existen en el nuevo backend

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Tarea, TareaFase, TareaStatus, TareasResponse, InitializeResponse } from '../../models/Tarea';

export interface EstadisticasChecklist {
  total:       number;
  completed:   number;
  in_progress: number;
  pending:     number;
  // por fase (viene dentro de grouped en el GET /)
  porFase?: {
    fase:      string;
    total:     number;
    completed: number;
  }[];
}

@Injectable({ providedIn: 'root' })
export class TareasService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  // ════════════════════════════════════════
  // INICIALIZACIÓN
  // ════════════════════════════════════════

  /**
   * Inicializa las 32 tareas predefinidas en 6 fases.
   * Es idempotente: si ya existe alguna fase, la omite.
   * Antes: POST /api/checklist/inicializar
   */
  inicializarChecklist(weddingId: string): Observable<InitializeResponse> {
    return this.http.post<InitializeResponse>(
      `${this.apiUrl}/weddings/${weddingId}/tasks/initialize`,
      {},
    );
  }

  // ════════════════════════════════════════
  // LECTURA
  // ════════════════════════════════════════

  /**
   * Obtiene todas las tareas con agrupación por fase y totales.
   * Antes: GET /api/checklist/:codigoBoda
   */
  getChecklist(weddingId: string): Observable<TareasResponse> {
    return this.http.get<TareasResponse>(
      `${this.apiUrl}/weddings/${weddingId}/tasks`,
    );
  }

  /**
   * Obtiene tareas filtradas por fase.
   * Antes: GET /api/checklist/:codigoBoda/fase/:fase
   */
  getTareasByFase(weddingId: string, fase: TareaFase): Observable<TareasResponse> {
    return this.http.get<TareasResponse>(
      `${this.apiUrl}/weddings/${weddingId}/tasks?phase=${fase}`,
    );
  }

  /**
   * Obtiene tareas filtradas por estado.
   */
  getTareasByStatus(weddingId: string, status: TareaStatus): Observable<TareasResponse> {
    return this.http.get<TareasResponse>(
      `${this.apiUrl}/weddings/${weddingId}/tasks?status=${status}`,
    );
  }

  /**
   * Obtiene solo las tareas asignadas al usuario autenticado.
   */
  getMisTareas(weddingId: string): Observable<TareasResponse> {
    return this.http.get<TareasResponse>(
      `${this.apiUrl}/weddings/${weddingId}/tasks?assigned_to_me=true`,
    );
  }

  // ════════════════════════════════════════
  // CRUD
  // ════════════════════════════════════════

  /**
   * Crea una tarea personalizada.
   * Antes: POST /api/checklist/:codigoBoda/tarea
   */
  crearTarea(weddingId: string, tarea: Partial<Tarea>): Observable<{ success: boolean; data: Tarea }> {
    return this.http.post<{ success: boolean; data: Tarea }>(
      `${this.apiUrl}/weddings/${weddingId}/tasks`,
      tarea,
    );
  }

  /**
   * Actualiza campos de una tarea.
   * Antes: PUT /api/checklist/:codigoBoda/tarea/:tareaId
   */
  actualizarTarea(taskId: string, datos: Partial<Tarea>): Observable<{ success: boolean; data: Tarea }> {
    return this.http.patch<{ success: boolean; data: Tarea }>(
      `${this.apiUrl}/tasks/${taskId}`,
      datos,
    );
  }

  /**
   * Cambia el estado de una tarea.
   * Si status='completed' → el backend rellena completed_at automáticamente.
   * Si status='pending' o 'in_progress' → el backend pone completed_at=null.
   *
   * MAPEO de estados del backend viejo al nuevo:
   *   'pendiente'   → 'pending'
   *   'en_progreso' → 'in_progress'
   *   'completada'  → 'completed'
   *
   * Antes: PATCH /api/checklist/:codigoBoda/tarea/:tareaId/estado
   */
  cambiarEstado(taskId: string, status: TareaStatus): Observable<{ success: boolean; data: Tarea }> {
    return this.http.patch<{ success: boolean; data: Tarea }>(
      `${this.apiUrl}/tasks/${taskId}/status`,
      { status },
    );
  }

  /**
   * Elimina una tarea (soft delete).
   * Antes: DELETE /api/checklist/:codigoBoda/tarea/:tareaId
   */
  eliminarTarea(taskId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `${this.apiUrl}/tasks/${taskId}`,
    );
  }

  // ════════════════════════════════════════
  // ESTADÍSTICAS
  // Los totales vienen incluidos en el GET / (campo totals)
  // No hay endpoint separado de estadísticas en el nuevo backend
  // ════════════════════════════════════════

  /**
   * Obtiene estadísticas del checklist.
   * En el nuevo backend vienen dentro del GET /tasks (campo 'totals').
   * Este método hace el mismo GET y extrae los totales.
   */
  getEstadisticas(weddingId: string): Observable<TareasResponse> {
    return this.http.get<TareasResponse>(
      `${this.apiUrl}/weddings/${weddingId}/tasks`,
    );
  }

  // ════════════════════════════════════════
  // RECORDATORIOS
  // ⚠️ NO IMPLEMENTADOS en el nuevo backend.
  // Se dejan como métodos vacíos para no romper componentes
  // que los llamen — devuelven un Observable vacío.
  // ════════════════════════════════════════

  /** @deprecated No existe en el nuevo backend */
  configurarRecordatorio(_weddingId: string, _taskId: string, _activo: boolean): Observable<any> {
    console.warn('[TareasService] configurarRecordatorio no está implementado en API v2');
    return new Observable(obs => { obs.next(null); obs.complete(); });
  }

  /** @deprecated No existe en el nuevo backend */
  getRecordatoriosPendientes(_weddingId: string): Observable<any[]> {
    console.warn('[TareasService] getRecordatoriosPendientes no está implementado en API v2');
    return new Observable(obs => { obs.next([]); obs.complete(); });
  }
}