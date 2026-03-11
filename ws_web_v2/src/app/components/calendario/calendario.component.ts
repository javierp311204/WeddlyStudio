// src/app/components/calendario/calendario.component.ts
import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { TareasService } from '../../services/tareas/tareas.service';
import { ExportService } from '../../services/gestion/export.service';
import { NotificationService } from '../../services/notification/notification.service';
import { Tarea, TareaFase, FASES_BODA } from '../../models/Tarea';

export interface CalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeddingDay: boolean;
  tasks: Tarea[];
}

export interface CalendarWeek {
  days: CalendarDay[];
}

@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule],
  templateUrl: './calendario.component.html',
  styleUrl: './calendario.component.css',
})
export class CalendarioComponent implements OnInit, OnChanges {

  @Input() weddingId: string = '';
  @Input() weddingDate: string | null = null;
  @Input() weddingName: string = 'Mi Boda';
  @Input() planType: string = 'free';

  // Calendar state
  currentDate: Date = new Date();
  viewYear: number = new Date().getFullYear();
  viewMonth: number = new Date().getMonth();
  weeks: CalendarWeek[] = [];
  allTasks: Tarea[] = [];

  // Selected day
  selectedDay: CalendarDay | null = null;

  showAssignModal: boolean = false;
  assigningTask: boolean = false;
  taskSearchQuery: string = '';

  // UI state
  loading: boolean = true;
  exportingICS: boolean = false;
  exportingPDF: boolean = false;

  readonly MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  readonly DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  readonly STATUS_COLORS: Record<string, string> = {
    pending: '#94a3b8',
    in_progress: '#f59e0b',
    completed: '#10b981',
    cancelled: '#ef4444',
  };

  readonly PHASE_COLORS: Record<string, string> = {
    '12_months': '#8B5CF6',
    '9_months': '#EC4899',
    '6_months': '#F59E0B',
    '3_months': '#10B981',
    '1_month': '#3B82F6',
    '1_week': '#EF4444',
  };

  get isPlanFree(): boolean {
    return this.planType === 'free';
  }

  get currentMonthLabel(): string {
    return `${this.MONTH_NAMES[this.viewMonth]} ${this.viewYear}`;
  }

  constructor(
    private tareasService: TareasService,
    private exportService: ExportService,
    private notifService: NotificationService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    if (this.weddingId) {
      this.loadTasks();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['weddingId'] && !changes['weddingId'].firstChange) {
      this.loadTasks();
    }
  }

  async loadTasks(): Promise<void> {
    this.loading = true;
    try {
      const response = await this.tareasService.getChecklist(this.weddingId).toPromise();
      const payload = (response as any)?.data ?? response;
      this.allTasks = payload?.tasks ?? [];
      this.buildCalendar();
    } catch (error) {
      console.error('Error cargando tareas para calendario:', error);
      this.notifService.showError('Error', 'No se pudieron cargar las tareas del calendario');
    } finally {
      this.loading = false;
    }
  }

  buildCalendar(): void {
    const year = this.viewYear;
    const month = this.viewMonth;
    const today = new Date();
    const weddingDate = this.weddingDate ? new Date(this.weddingDate) : null;

    // First day of month (adjust for Monday start)
    const firstDay = new Date(year, month, 1);
    let startDow = firstDay.getDay(); // 0=Sun
    startDow = startDow === 0 ? 6 : startDow - 1; // Convert to Mon=0

    // Last day of month
    const lastDay = new Date(year, month + 1, 0);

    // Tasks with due_date in this period indexed by day key
    const tasksByDay = new Map<string, Tarea[]>();
    for (const task of this.allTasks) {
      if (!task.due_date) continue;
      const d = new Date(task.due_date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!tasksByDay.has(key)) tasksByDay.set(key, []);
      tasksByDay.get(key)!.push(task);
    }

    const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const isSameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    this.weeks = [];
    let week: CalendarDay[] = [];

    // Fill leading days from previous month
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      week.push({
        date: d,
        dayNumber: d.getDate(),
        isCurrentMonth: false,
        isToday: isSameDay(d, today),
        isWeddingDay: weddingDate ? isSameDay(d, weddingDate) : false,
        tasks: tasksByDay.get(dayKey(d)) ?? [],
      });
    }

    // Fill days of month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const d = new Date(year, month, day);
      week.push({
        date: d,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: isSameDay(d, today),
        isWeddingDay: weddingDate ? isSameDay(d, weddingDate) : false,
        tasks: tasksByDay.get(dayKey(d)) ?? [],
      });

      if (week.length === 7) {
        this.weeks.push({ days: week });
        week = [];
      }
    }

    // Fill trailing days from next month
    if (week.length > 0) {
      let nextDay = 1;
      while (week.length < 7) {
        const d = new Date(year, month + 1, nextDay++);
        week.push({
          date: d,
          dayNumber: d.getDate(),
          isCurrentMonth: false,
          isToday: isSameDay(d, today),
          isWeddingDay: weddingDate ? isSameDay(d, weddingDate) : false,
          tasks: tasksByDay.get(dayKey(d)) ?? [],
        });
      }
      this.weeks.push({ days: week });
    }
  }

  openAssignModal(): void {
    this.taskSearchQuery = '';
    this.showAssignModal = true;
  }

  closeAssignModal(): void {
    this.showAssignModal = false;
    this.taskSearchQuery = '';
  }

  prevMonth(): void {
    if (this.viewMonth === 0) {
      this.viewMonth = 11;
      this.viewYear--;
    } else {
      this.viewMonth--;
    }
    this.buildCalendar();
  }

  nextMonth(): void {
    if (this.viewMonth === 11) {
      this.viewMonth = 0;
      this.viewYear++;
    } else {
      this.viewMonth++;
    }
    this.buildCalendar();
  }

  goToToday(): void {
    const today = new Date();
    this.viewMonth = today.getMonth();
    this.viewYear = today.getFullYear();
    this.buildCalendar();
  }

  goToWeddingMonth(): void {
    if (!this.weddingDate) return;
    const d = new Date(this.weddingDate);
    this.viewMonth = d.getMonth();
    this.viewYear = d.getFullYear();
    this.buildCalendar();
  }

  selectDay(day: CalendarDay): void {
    if (this.selectedDay?.date.getTime() === day.date.getTime()) {
      this.selectedDay = null;
    } else {
      this.selectedDay = day;
    }
  }

  closeDetail(): void {
    this.selectedDay = null;
  }

  get assignableTasks(): Tarea[] {
    const query = this.taskSearchQuery.toLowerCase().trim();
    return this.allTasks.filter(t =>
      t.status !== 'completed' &&
      t.status !== 'cancelled' &&
      !t.due_date &&
      (!query || t.title.toLowerCase().includes(query))
    );
  }

  getTaskDotColor(task: Tarea): string {
    return this.PHASE_COLORS[task.phase ?? ''] ?? this.STATUS_COLORS[task.status] ?? '#94a3b8';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'Pendiente',
      in_progress: 'En progreso',
      completed: 'Completada',
      cancelled: 'Cancelada',
    };
    return map[status] ?? status;
  }

  getPhaseLabel(phase: string | null | undefined): string {
    if (!phase) return '';
    return FASES_BODA[phase as TareaFase]?.titulo ?? phase;
  }

  // Tasks with due_date this month (for mini stats)
  get tasksThisMonth(): Tarea[] {
    return this.allTasks.filter(t => {
      if (!t.due_date) return false;
      const d = new Date(t.due_date);
      return d.getFullYear() === this.viewYear && d.getMonth() === this.viewMonth;
    });
  }

  get tasksWithoutDate(): Tarea[] {
    return this.allTasks.filter(t => !t.due_date && t.status !== 'completed');
  }

  async assignTaskToDay(task: Tarea): Promise<void> {
    if (!this.selectedDay || this.assigningTask || !task.id) return;

    this.assigningTask = true;
    try {
      const due_date = new Date(this.selectedDay.date);
      due_date.setHours(12, 0, 0, 0); // mediodía para evitar problemas de zona horaria

      await this.tareasService
        .actualizarTarea(task.id, { due_date: due_date.toISOString() })
        .toPromise();

      this.notifService.showSuccess(
        'Tarea asignada',
        `"${task.title}" asignada al ${this.selectedDay.date.toLocaleDateString('es-ES')}`
      );

      this.closeAssignModal();
      await this.loadTasks(); // recargar para reflejar el cambio
    } catch (error) {
      console.error('Error asignando tarea:', error);
      this.notifService.showError('Error', 'No se pudo asignar la tarea');
    } finally {
      this.assigningTask = false;
    }
  }

  // ─────────────────────────────────────────────
  // EXPORTACIONES
  // ─────────────────────────────────────────────

  async exportToGoogleCalendar(): Promise<void> {
    if (this.exportingICS) return;
    this.exportingICS = true;
    try {
      await this.exportService.triggerICSDownload(this.weddingId, this.weddingName);
      this.notifService.showSuccess(
        '¡Calendario exportado!',
        'Abre el archivo .ics para importarlo en Google Calendar o Apple Calendar.',
      );
    } catch (error: any) {
      this.notifService.showError('Error', 'No se pudo exportar el calendario.');
    } finally {
      this.exportingICS = false;
    }
  }

  async exportToPDF(): Promise<void> {
    if (this.isPlanFree) {
      this.notifService.showError(
        'Plan requerido',
        'La exportación PDF está disponible en los planes de pago. ¡Actualiza tu plan!',
      );
      return;
    }
    if (this.exportingPDF) return;
    this.exportingPDF = true;
    try {
      await this.exportService.generateAndDownloadPDF(this.weddingId);
      this.notifService.showSuccess('¡PDF generado!', 'Se abrirá el diálogo de impresión.');
    } catch (error: any) {
      const msg = error?.error?.message ?? 'No se pudo generar el PDF.';
      this.notifService.showError('Error', msg);
    } finally {
      this.exportingPDF = false;
    }
  }
}