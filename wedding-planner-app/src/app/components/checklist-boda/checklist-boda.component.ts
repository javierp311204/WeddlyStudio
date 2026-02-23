import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TareasService } from '../../services/tareas/tareas.service';
import { NotificationService } from '../../services/notification/notification.service';
import {
  Tarea,
  FaseChecklist,
  FASES_BODA,
  CATEGORIAS_TAREA,
} from '../../models/Tarea';

@Component({
  selector: 'app-checklist-boda',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './checklist-boda.component.html',
  styleUrl: './checklist-boda.component.css',
})
export class ChecklistBodaComponent implements OnInit {

  fases: FaseChecklist[] = [];
  faseActiva: string = 'seis_meses';
  codigoBoda: string = '';

  mostrarModalNuevaTarea: boolean = false;
  mostrarModalEditarTarea: boolean = false;
  mostrarModalInicializar: boolean = false;

  tareaActual: Partial<Tarea> = this.getTareaVacia();

  cargando: boolean = true;
  inicializando: boolean = false;
  guardando: boolean = false;

  estadisticas: any = null;

  filtroEstado: 'todas' | 'pendiente' | 'en_progreso' | 'completada' = 'todas';
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
    this.codigoBoda = localStorage.getItem('codigoBoda') || '';

    if (!this.codigoBoda) {
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
  console.log('1. Iniciando verificación, codigoBoda:', this.codigoBoda);

  try {
    const verificacion = await this.tareasService
      .verificarChecklist(this.codigoBoda)
      .toPromise();

    console.log('2. Respuesta verificación:', verificacion);

    if (verificacion && verificacion.existe) {
      await this.cargarTareas();
      await this.cargarEstadisticas();
    } else {
      console.log('3. No existe checklist, mostrando modal...');
      this.mostrarModalInicializar = true;
      this.cdr.detectChanges();
      console.log('4. mostrarModalInicializar =', this.mostrarModalInicializar);
    }
  } catch (error: any) {
    console.error('ERROR:', error);
  } finally {
    console.log('5. finally - cargando = false, mostrarModalInicializar =', this.mostrarModalInicializar);
    this.cargando = false;
  }
}

  async inicializarChecklist(): Promise<void> {
    this.inicializando = true;
    try {
      await this.tareasService.inicializarChecklist(this.codigoBoda).toPromise();
      this.notifService.showSuccess(
        this.translate.instant('CHECKLIST.NOTIFICATIONS.CHECKLIST_CREATED'),
        this.translate.instant('CHECKLIST.NOTIFICATIONS.CHECKLIST_CREATED_DESC')
      );
      this.mostrarModalInicializar = false;
      await this.cargarTareas();
      await this.cargarEstadisticas();
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
      const checklist = await this.tareasService
        .getChecklist(this.codigoBoda)
        .toPromise();

      if (checklist) {
        this.organizarTareasPorFase(checklist.tareas);
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
      const faseInfo = FASES_BODA[faseKey];
      const tareasFase = tareas.filter((t) => t.fase === faseKey);
      const completadas = tareasFase.filter((t) => t.estado === 'completada').length;
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

  async cargarEstadisticas(): Promise<void> {
    try {
      this.estadisticas = await this.tareasService
        .getEstadisticas(this.codigoBoda)
        .toPromise();
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  }

  // ============================================
  // GESTIÓN DE TAREAS
  // ============================================

  abrirModalNuevaTarea(fase?: string): void {
    this.tareaActual = this.getTareaVacia();
    if (fase) this.tareaActual.fase = fase as any;
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
      if (this.tareaActual._id) {
        await this.tareasService
          .actualizarTarea(this.codigoBoda, this.tareaActual._id, this.tareaActual)
          .toPromise();
        this.notifService.showSuccess(
          this.translate.instant('CHECKLIST.NOTIFICATIONS.TASK_UPDATED'),
          this.translate.instant('CHECKLIST.NOTIFICATIONS.TASK_UPDATED_DESC')
        );
        this.mostrarModalEditarTarea = false;
      } else {
        await this.tareasService
          .crearTarea(this.codigoBoda, this.tareaActual)
          .toPromise();
        this.notifService.showSuccess(
          this.translate.instant('CHECKLIST.NOTIFICATIONS.TASK_CREATED'),
          this.translate.instant('CHECKLIST.NOTIFICATIONS.TASK_CREATED_DESC')
        );
        this.mostrarModalNuevaTarea = false;
      }

      await this.cargarTareas();
      await this.cargarEstadisticas();
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
    nuevoEstado: 'pendiente' | 'en_progreso' | 'completada',
  ): Promise<void> {
    if (!tarea._id) return;

    try {
      await this.tareasService
        .cambiarEstado(this.codigoBoda, tarea._id, nuevoEstado)
        .toPromise();

      tarea.estado = nuevoEstado;
      if (nuevoEstado === 'completada') tarea.fechaCompletada = new Date();

      await this.cargarTareas();
      await this.cargarEstadisticas();
    } catch (error) {
      console.error('Error cambiando estado:', error);
      this.notifService.showError(
        this.translate.instant('COMMON.ERROR'),
        this.translate.instant('CHECKLIST.NOTIFICATIONS.ERROR_UPDATE')
      );
    }
  }

  async eliminarTarea(tarea: Tarea): Promise<void> {
    if (!tarea._id) return;

    const confirmado = await this.notifService.askConfirmation(
      this.translate.instant('CHECKLIST.NOTIFICATIONS.DELETE_CONFIRM'),
      this.translate.instant('CHECKLIST.NOTIFICATIONS.DELETE_CONFIRM_DESC', { titulo: tarea.titulo }),
      'eliminar_tarea',
    );

    if (!confirmado) return;

    try {
      await this.tareasService.eliminarTarea(this.codigoBoda, tarea._id).toPromise();
      this.notifService.showSuccess(
        this.translate.instant('CHECKLIST.NOTIFICATIONS.TASK_DELETED'),
        this.translate.instant('CHECKLIST.NOTIFICATIONS.TASK_DELETED_DESC')
      );
      await this.cargarTareas();
      await this.cargarEstadisticas();
    } catch (error) {
      console.error('Error eliminando tarea:', error);
      this.notifService.showError(
        this.translate.instant('COMMON.ERROR'),
        this.translate.instant('CHECKLIST.NOTIFICATIONS.ERROR_DELETE')
      );
    }
  }

  async toggleRecordatorio(tarea: Tarea): Promise<void> {
    if (!tarea._id) return;

    const nuevoEstado = !tarea.recordatorio?.activo;

    try {
      await this.tareasService
        .configurarRecordatorio(this.codigoBoda, tarea._id, nuevoEstado, 3)
        .toPromise();

      if (!tarea.recordatorio) {
        tarea.recordatorio = { activo: false, diasAntes: 3, enviado: false };
      }
      tarea.recordatorio.activo = nuevoEstado;

      this.notifService.showSuccess(
        this.translate.instant(nuevoEstado ? 'CHECKLIST.NOTIFICATIONS.REMINDER_ON' : 'CHECKLIST.NOTIFICATIONS.REMINDER_OFF'),
        this.translate.instant(nuevoEstado ? 'CHECKLIST.NOTIFICATIONS.REMINDER_ON_DESC' : 'CHECKLIST.NOTIFICATIONS.REMINDER_OFF_DESC')
      );
    } catch (error) {
      console.error('Error configurando recordatorio:', error);
      this.notifService.showError(
        this.translate.instant('COMMON.ERROR'),
        this.translate.instant('CHECKLIST.NOTIFICATIONS.ERROR_REMINDER')
      );
    }
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

    let tareas = this.faseActualData.tareas;

    if (this.filtroEstado !== 'todas') {
      tareas = tareas.filter((t) => t.estado === this.filtroEstado);
    }

    if (this.filtroCategoria !== 'todas') {
      tareas = tareas.filter((t) => t.categoria === this.filtroCategoria);
    }

    if (this.busqueda.trim()) {
      const termino = this.busqueda.toLowerCase();
      tareas = tareas.filter(
        (t) =>
          t.titulo.toLowerCase().includes(termino) ||
          t.descripcion?.toLowerCase().includes(termino),
      );
    }

    return tareas;
  }

  // ============================================
  // UTILIDADES
  // ============================================

  private getTareaVacia(): Partial<Tarea> {
    return {
      titulo: '',
      descripcion: '',
      fase: 'seis_meses',
      categoria: 'otro',
      estado: 'pendiente',
      codigoBoda: this.codigoBoda,
      recordatorio: { activo: false, diasAntes: 3, enviado: false },
    };
  }

  private validarTarea(): boolean {
    if (!this.tareaActual.titulo || this.tareaActual.titulo.trim() === '') {
      this.notifService.showError(
        this.translate.instant('COMMON.ERROR'),
        this.translate.instant('CHECKLIST.NOTIFICATIONS.TITLE_REQUIRED')
      );
      return false;
    }
    if (!this.tareaActual.fase) {
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

  volverAlPanel(): void {
    this.router.navigate(['/home']);
  }

  getEstadoLabel(estado: string): string {
    const claves: { [key: string]: string } = {
      pendiente: 'CHECKLIST.TASK.PENDING',
      en_progreso: 'CHECKLIST.TASK.IN_PROGRESS',
      completada: 'CHECKLIST.TASK.COMPLETED',
    };
    return this.translate.instant(claves[estado] || estado);
  }

  getTareasCompletadas(fase: FaseChecklist): number {
    if (!fase || !fase.tareas) return 0;
    return fase.tareas.filter((t: Tarea) => t.estado === 'completada').length;
  }
}