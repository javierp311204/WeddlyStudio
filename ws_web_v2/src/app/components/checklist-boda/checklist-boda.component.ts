import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TareasService } from '../../services/tareas/tareas.service';
import { NotificationService } from '../../services/notification/notification.service';
import {
  Tarea,
  TareaFase,
  TareaStatus,
  FaseChecklist,
  FASES_BODA,
  CATEGORIAS_TAREA,
} from '../../models/Tarea';

// ─────────────────────────────────────────────────────────────
// MIGRACIÓN v2: Cambios principales
//
//  • codigoBoda  →  weddingId  (UUID desde localStorage)
//  • tarea._id   →  tarea.id
//  • tarea.titulo  →  task.title  (mapeo en el servicio/modelo)
//  • Estados: 'pendiente'→'pending' | 'en_progreso'→'in_progress' | 'completada'→'completed'
//  • tarea.fase: 'seis_meses'→'6_months', etc. (mapeo en el servicio/modelo)
//  • verificarChecklist() ELIMINADO — GET /tasks ya devuelve `totals`; si totals.total===0
//    se muestra el modal de inicializar directamente.
//  • getEstadisticas() ELIMINADO — los estadísticas vienen en `totals` del GET /tasks.
//  • toggleRecordatorio() ELIMINADO — recordatorios no implementados en v2.
//    Se mantiene el método con aviso en consola para no romper el template.
// ─────────────────────────────────────────────────────────────

@Component({
  selector: 'app-checklist-boda',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './checklist-boda.component.html',
  styleUrl: './checklist-boda.component.css',
})
export class ChecklistBodaComponent implements OnInit {

  fases: FaseChecklist[] = [];
  faseActiva: string = '6_months';   // v2 usa '6_months', no 'seis_meses'
  weddingId: string = '';            // antes: codigoBoda

  mostrarModalNuevaTarea: boolean = false;
  mostrarModalEditarTarea: boolean = false;
  mostrarModalInicializar: boolean = false;

  tareaActual: Partial<Tarea> = this.getTareaVacia();

  cargando: boolean = true;
  inicializando: boolean = false;
  guardando: boolean = false;

  // v2: las estadísticas vienen en el GET /tasks como `totals`
  estadisticas: any = null;

  filtroEstado: 'todas' | 'pending' | 'in_progress' | 'completed' = 'todas';
  filtroCategoria: string = 'todas';
  busqueda: string = '';

  readonly FASES_BODA = FASES_BODA;
  readonly CATEGORIAS = CATEGORIAS_TAREA;

  constructor(
    private tareasService: TareasService,
    private notifService: NotificationService,
    private router: Router,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // v2: se usa 'weddingId' en localStorage (UUID)
    this.weddingId = localStorage.getItem('weddingId') || '';

    if (!this.weddingId) {
      this.notifService.showError(
        this.translate.instant('COMMON.ERROR'),
        this.translate.instant('CHECKLIST.NOTIFICATIONS.NO_WEDDING_CODE')
      );
      this.router.navigate(['/home']);
      return;
    }

    this.verificarYCargarChecklist();
  }

  // ============================================
  // INICIALIZACIÓN Y CARGA
  // ============================================

  async verificarYCargarChecklist(): Promise<void> {
    this.cargando = true;

    try {
      // v2: no existe endpoint "verificar". Cargamos directamente las tareas;
      // si totals.total === 0 mostramos el modal de inicialización.
      await this.cargarTareas();
    } catch (error: any) {
      console.error('ERROR:', error);
    } finally {
      this.cargando = false;
    }
  }

  async inicializarChecklist(): Promise<void> {
    this.inicializando = true;
    try {
      // v2: POST /api/weddings/:weddingId/tasks/initialize
      await this.tareasService.inicializarChecklist(this.weddingId).toPromise();
      this.notifService.showSuccess(
        this.translate.instant('CHECKLIST.NOTIFICATIONS.CHECKLIST_CREATED'),
        this.translate.instant('CHECKLIST.NOTIFICATIONS.CHECKLIST_CREATED_DESC')
      );
      this.mostrarModalInicializar = false;
      await this.cargarTareas();
    } catch (error) {
      console.error('Error inicializando:', error);
      this.notifService.showError(
        this.translate.instant('COMMON.ERROR'),
        this.translate.instant('CHECKLIST.NOTIFICATIONS.ERROR_CREATE')
      );
    } finally {
      this.inicializando = false;
    }
  }

  async cargarTareas(): Promise<void> {
    try {
      const response = await this.tareasService.getChecklist(this.weddingId).toPromise();

      const payload = (response as any)?.data ?? response;  // ← extraer .data

      this.estadisticas = payload?.totals ?? null;

      if (!payload?.tasks || payload.tasks.length === 0) {
        this.mostrarModalInicializar = true;
        this.cdr.detectChanges();
      } else {
        this.organizarTareasPorFase(payload.tasks);
      }
    } catch (error: any) {
      console.error('Error cargando tareas:', error);
      this.notifService.showError(
        this.translate.instant('COMMON.ERROR'),
        this.translate.instant('CHECKLIST.NOTIFICATIONS.ERROR_LOAD')
      );
    }
  }

  organizarTareasPorFase(tareas: Tarea[]): void {
    this.fases = Object.keys(FASES_BODA).map((faseKey) => {
      const faseInfo = FASES_BODA[faseKey as TareaFase]; // FIX TS7053
      // v2: campo 'phase' (antes 'fase')
      const tareasFase = tareas.filter((t) => t.phase === faseKey);
      // v2: campo 'status' (antes 'estado')
      const completadas = tareasFase.filter((t) => t.status === 'completed').length;
      const progreso = tareasFase.length > 0 ? (completadas / tareasFase.length) * 100 : 0;

      return {
        fase: faseKey,
        titulo: faseInfo.titulo,
        descripcion: faseInfo.descripcion,
        icon: faseInfo.icon,
        color: faseInfo.color,
        tareas: tareasFase,
        progreso: Math.round(progreso),
      };
    });
  }

  // ============================================
  // GESTIÓN DE TAREAS
  // ============================================

  abrirModalNuevaTarea(fase?: string): void {
    this.tareaActual = this.getTareaVacia();
    if (fase) this.tareaActual.phase = fase as TareaFase;
    this.mostrarModalNuevaTarea = true;
  }

  abrirModalEditarTarea(tarea: Tarea): void {
    this.tareaActual = { ...tarea };
    this.mostrarModalEditarTarea = true;
  }

  async guardarTarea(): Promise<void> {
    if (!this.validarTarea()) return;

    this.guardando = true;
    try {
      if (this.tareaActual.id) {
        // Solo enviamos los campos que acepta UpdateTaskInput
        const payload: Partial<Tarea> = {
          title:            this.tareaActual.title,
          description:      this.tareaActual.description,
          phase:            this.tareaActual.phase,
          category:         this.tareaActual.category,
          assigned_user_id: this.tareaActual.assigned_user_id,
          due_date:         this.tareaActual.due_date
                              ? new Date(this.tareaActual.due_date).toISOString()
                              : undefined,
        };

        // Eliminar claves con valor undefined para no contaminar el body
        Object.keys(payload).forEach(k => {
          if ((payload as any)[k] === undefined) delete (payload as any)[k];
        });

        await this.tareasService
          .actualizarTarea(this.tareaActual.id, payload)
          .toPromise();

        this.notifService.showSuccess(
          this.translate.instant('CHECKLIST.NOTIFICATIONS.TASK_UPDATED'),
          this.translate.instant('CHECKLIST.NOTIFICATIONS.TASK_UPDATED_DESC')
        );
        this.mostrarModalEditarTarea = false;
      } else {
        await this.tareasService
          .crearTarea(this.weddingId, this.tareaActual)
          .toPromise();
        this.notifService.showSuccess(
          this.translate.instant('CHECKLIST.NOTIFICATIONS.TASK_CREATED'),
          this.translate.instant('CHECKLIST.NOTIFICATIONS.TASK_CREATED_DESC')
        );
        this.mostrarModalNuevaTarea = false;
      }

      await this.cargarTareas();
    } catch (error) {
      console.error('Error guardando tarea:', error);
      this.notifService.showError(
        this.translate.instant('COMMON.ERROR'),
        this.translate.instant('CHECKLIST.NOTIFICATIONS.ERROR_SAVE')
      );
    } finally {
      this.guardando = false;
    }
  }

  async cambiarEstadoTarea(
    tarea: Tarea,
    // v2: estados en inglés
    nuevoEstado: 'pending' | 'in_progress' | 'completed',
  ): Promise<void> {
    if (!tarea.id) return;

    try {
      // v2: PATCH /api/tasks/:taskId/status — firma: cambiarEstado(taskId, status)
      await this.tareasService
        .cambiarEstado(tarea.id, nuevoEstado)
        .toPromise();

      tarea.status = nuevoEstado;
      // v2: completed_at es string ISO (lo rellena el backend; aquí lo limpiamos optimistamente)
      if (nuevoEstado !== 'completed') tarea.completed_at = null;

      await this.cargarTareas();
    } catch (error) {
      console.error('Error cambiando estado:', error);
      this.notifService.showError(
        this.translate.instant('COMMON.ERROR'),
        this.translate.instant('CHECKLIST.NOTIFICATIONS.ERROR_UPDATE')
      );
    }
  }

  async eliminarTarea(tarea: Tarea): Promise<void> {
    if (!tarea.id) return;

    const confirmado = await this.notifService.askConfirmation(
      this.translate.instant('CHECKLIST.NOTIFICATIONS.DELETE_CONFIRM'),
      this.translate.instant('CHECKLIST.NOTIFICATIONS.DELETE_CONFIRM_DESC', { titulo: tarea.title }),
      'eliminar_tarea',
    );

    if (!confirmado) return;

    try {
      // v2: DELETE /api/tasks/:taskId — firma: eliminarTarea(taskId)
      await this.tareasService.eliminarTarea(tarea.id).toPromise();
      this.notifService.showSuccess(
        this.translate.instant('CHECKLIST.NOTIFICATIONS.TASK_DELETED'),
        this.translate.instant('CHECKLIST.NOTIFICATIONS.TASK_DELETED_DESC')
      );
      await this.cargarTareas();
    } catch (error) {
      console.error('Error eliminando tarea:', error);
      this.notifService.showError(
        this.translate.instant('COMMON.ERROR'),
        this.translate.instant('CHECKLIST.NOTIFICATIONS.ERROR_DELETE')
      );
    }
  }

  // ⚠️ v2: Recordatorios NO implementados en la API v2.
  // Método conservado para no romper el template; muestra aviso al usuario.
  async toggleRecordatorio(tarea: Tarea): Promise<void> {
    console.warn('toggleRecordatorio: los recordatorios no están implementados en API v2');
    this.notifService.showError(
      this.translate.instant('COMMON.ERROR'),
      'Los recordatorios no están disponibles aún en esta versión.'
    );
  }

  // ============================================
  // NAVEGACIÓN Y FILTROS
  // ============================================

  cambiarFase(fase: string): void {
    this.faseActiva = fase;
  }

  get faseActualData(): FaseChecklist | undefined {
    return this.fases.find((f) => f.fase === this.faseActiva);
  }

  get tareasFiltradas(): Tarea[] {
    if (!this.faseActualData) return [];

    let tareas: Tarea[] = this.faseActualData.tareas;

    // v2: campo 'status' (antes 'estado')
    if (this.filtroEstado !== 'todas') {
      tareas = tareas.filter((t: Tarea) => t.status === this.filtroEstado);
    }

    // v2: campo 'category' (antes 'categoria')
    if (this.filtroCategoria !== 'todas') {
      tareas = tareas.filter((t: Tarea) => t.category === this.filtroCategoria);
    }

    if (this.busqueda.trim()) {
      const termino = this.busqueda.toLowerCase();
      tareas = tareas.filter(
        (t: Tarea) =>
          t.title.toLowerCase().includes(termino) ||
          t.description?.toLowerCase().includes(termino),
      );
    }

    return tareas;
  }

  // ============================================
  // UTILIDADES
  // ============================================

  private getTareaVacia(): Partial<Tarea> {
    return {
      title:    '',
      description: '',
      phase:    '6_months',   // v2: TareaFase
      category: 'otro',
      status:   'pending',    // v2: TareaStatus
    };
  }

  private validarTarea(): boolean {
    if (!this.tareaActual.title || this.tareaActual.title.trim() === '') {
      this.notifService.showError(
        this.translate.instant('COMMON.ERROR'),
        this.translate.instant('CHECKLIST.NOTIFICATIONS.TITLE_REQUIRED')
      );
      return false;
    }
    if (!this.tareaActual.phase) {
      this.notifService.showError(
        this.translate.instant('COMMON.ERROR'),
        this.translate.instant('CHECKLIST.NOTIFICATIONS.PHASE_REQUIRED')
      );
      return false;
    }
    return true;
  }

  cerrarModales(): void {
    this.mostrarModalNuevaTarea = false;
    this.mostrarModalEditarTarea = false;
    this.mostrarModalInicializar = false;
    this.tareaActual = this.getTareaVacia();
  }

  getEstadoLabel(estado: string): string {
    // v2: estados en inglés
    const claves: { [key: string]: string } = {
      pending:     'CHECKLIST.TASK.PENDING',
      in_progress: 'CHECKLIST.TASK.IN_PROGRESS',
      completed:   'CHECKLIST.TASK.COMPLETED',
      cancelled:   'CHECKLIST.TASK.CANCELLED',
    };
    return this.translate.instant(claves[estado] || estado);
  }

  getTareasCompletadas(fase: FaseChecklist): number {
    if (!fase || !fase.tareas) return 0;
    // v2: 'completed' en lugar de 'completada'
    return fase.tareas.filter((t: Tarea) => t.status === 'completed').length;
  }
}