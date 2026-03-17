// src/app/components/calendario/calendario.component.ts
import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { TareasService } from '../../services/tareas/tareas.service';
import { ExportService } from '../../services/gestion/export.service';
import { NotificationService } from '../../services/notification/notification.service';
import { Tarea, TareaFase, FASES_BODA } from '../../models/Tarea';
import { IconComponent } from '../../shared/icons/icon.component';

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
  imports: [CommonModule, TranslateModule, FormsModule, IconComponent],
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

  // Locale activo para el date pipe
  currentLocale: string = 'es-ES';

  private readonly LOCALE_MAP: Record<string, string> = {
    'es': 'es-ES',
    'fr': 'fr-FR',
    'en': 'en-US',
    'it': 'it-IT',
    'de': 'de-DE',
    'pt': 'pt-PT',
    'ca': 'ca',
  };

  // Nombres de meses y días obtenidos del translate
  MONTH_NAMES: string[] = [];
  DAY_NAMES: string[] = [];

  readonly STATUS_COLORS: Record<string, string> = {
    pending:     '#94a3b8',
    in_progress: '#f59e0b',
    completed:   '#10b981',
    cancelled:   '#ef4444',
  };

  readonly PHASE_COLORS: Record<string, string> = {
    '12_months': '#8B5CF6',
    '9_months':  '#EC4899',
    '6_months':  '#F59E0B',
    '3_months':  '#10B981',
    '1_month':   '#3B82F6',
    '1_week':    '#EF4444',
  };

  get isPlanFree(): boolean {
    return this.planType === 'free';
  }

  get currentMonthLabel(): string {
    return `${this.MONTH_NAMES[this.viewMonth] ?? ''} ${this.viewYear}`;
  }

  constructor(
    private tareasService: TareasService,
    private exportService: ExportService,
    private notifService: NotificationService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    // Inicializar locale con el idioma actual
    this.currentLocale = this.LOCALE_MAP[this.translate.currentLang ?? 'es'] ?? 'es-ES';

    this.loadI18nArrays();

    // Re-cargar arrays y locale cuando cambie el idioma
    this.translate.onLangChange.subscribe((event) => {
      this.currentLocale = this.LOCALE_MAP[event.lang] ?? 'es-ES';
      this.loadI18nArrays();
    });

    if (this.weddingId) {
      this.loadTasks();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['weddingId'] && !changes['weddingId'].firstChange) {
      this.loadTasks();
    }
  }

  private loadI18nArrays(): void {
    this.MONTH_NAMES = [
      this.translate.instant('CALENDARIO.MONTH_JAN'),
      this.translate.instant('CALENDARIO.MONTH_FEB'),
      this.translate.instant('CALENDARIO.MONTH_MAR'),
      this.translate.instant('CALENDARIO.MONTH_APR'),
      this.translate.instant('CALENDARIO.MONTH_MAY'),
      this.translate.instant('CALENDARIO.MONTH_JUN'),
      this.translate.instant('CALENDARIO.MONTH_JUL'),
      this.translate.instant('CALENDARIO.MONTH_AUG'),
      this.translate.instant('CALENDARIO.MONTH_SEP'),
      this.translate.instant('CALENDARIO.MONTH_OCT'),
      this.translate.instant('CALENDARIO.MONTH_NOV'),
      this.translate.instant('CALENDARIO.MONTH_DEC'),
    ];
    this.DAY_NAMES = [
      this.translate.instant('CALENDARIO.DAY_MON'),
      this.translate.instant('CALENDARIO.DAY_TUE'),
      this.translate.instant('CALENDARIO.DAY_WED'),
      this.translate.instant('CALENDARIO.DAY_THU'),
      this.translate.instant('CALENDARIO.DAY_FRI'),
      this.translate.instant('CALENDARIO.DAY_SAT'),
      this.translate.instant('CALENDARIO.DAY_SUN'),
    ];
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
      this.notifService.showError(
        this.translate.instant('COMMON.ERROR'),
        this.translate.instant('CALENDARIO.ERROR_LOAD_TASKS'),
      );
    } finally {
      this.loading = false;
    }
  }

  buildCalendar(): void {
    const year  = this.viewYear;
    const month = this.viewMonth;
    const today = new Date();
    const weddingDate = this.weddingDate ? new Date(this.weddingDate) : null;

    const firstDay = new Date(year, month, 1);
    let startDow = firstDay.getDay();
    startDow = startDow === 0 ? 6 : startDow - 1;

    const lastDay = new Date(year, month + 1, 0);

    const tasksByDay = new Map<string, Tarea[]>();
    for (const task of this.allTasks) {
      if (!task.due_date) continue;
      const d = new Date(task.due_date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!tasksByDay.has(key)) tasksByDay.set(key, []);
      tasksByDay.get(key)!.push(task);
    }

    const dayKey    = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const isSameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth()    === b.getMonth()    &&
      a.getDate()     === b.getDate();

    this.weeks = [];
    let week: CalendarDay[] = [];

    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      week.push({
        date: d, dayNumber: d.getDate(), isCurrentMonth: false,
        isToday: isSameDay(d, today),
        isWeddingDay: weddingDate ? isSameDay(d, weddingDate) : false,
        tasks: tasksByDay.get(dayKey(d)) ?? [],
      });
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const d = new Date(year, month, day);
      week.push({
        date: d, dayNumber: day, isCurrentMonth: true,
        isToday: isSameDay(d, today),
        isWeddingDay: weddingDate ? isSameDay(d, weddingDate) : false,
        tasks: tasksByDay.get(dayKey(d)) ?? [],
      });
      if (week.length === 7) { this.weeks.push({ days: week }); week = []; }
    }

    if (week.length > 0) {
      let nextDay = 1;
      while (week.length < 7) {
        const d = new Date(year, month + 1, nextDay++);
        week.push({
          date: d, dayNumber: d.getDate(), isCurrentMonth: false,
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
    if (this.viewMonth === 0) { this.viewMonth = 11; this.viewYear--; }
    else { this.viewMonth--; }
    this.buildCalendar();
  }

  nextMonth(): void {
    if (this.viewMonth === 11) { this.viewMonth = 0; this.viewYear++; }
    else { this.viewMonth++; }
    this.buildCalendar();
  }

  goToToday(): void {
    const today = new Date();
    this.viewMonth = today.getMonth();
    this.viewYear  = today.getFullYear();
    this.buildCalendar();
  }

  goToWeddingMonth(): void {
    if (!this.weddingDate) return;
    const d = new Date(this.weddingDate);
    this.viewMonth = d.getMonth();
    this.viewYear  = d.getFullYear();
    this.buildCalendar();
  }

  selectDay(day: CalendarDay): void {
    if (this.selectedDay?.date.getTime() === day.date.getTime()) {
      this.selectedDay = null;
    } else {
      this.selectedDay = day;
    }
  }

  closeDetail(): void { this.selectedDay = null; }

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
      pending:     this.translate.instant('CHECKLIST.TASK.PENDING'),
      in_progress: this.translate.instant('CHECKLIST.TASK.IN_PROGRESS'),
      completed:   this.translate.instant('CHECKLIST.TASK.COMPLETED'),
      cancelled:   this.translate.instant('COMMON.CANCEL'),
    };
    return map[status] ?? status;
  }

  getPhaseLabel(phase: string | null | undefined): string {
    if (!phase) return '';
    return FASES_BODA[phase as TareaFase]?.titulo ?? phase;
  }

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
      due_date.setHours(12, 0, 0, 0);
      await this.tareasService
        .actualizarTarea(task.id, { due_date: due_date.toISOString() })
        .toPromise();
      this.notifService.showSuccess(
        this.translate.instant('CALENDARIO.ASSIGN_SUCCESS_TITLE'),
        this.translate.instant('CALENDARIO.ASSIGN_SUCCESS_DESC', {
          title: task.title,
          date:  this.selectedDay.date.toLocaleDateString(),
        }),
      );
      this.closeAssignModal();
      await this.loadTasks();
    } catch (error) {
      console.error('Error asignando tarea:', error);
      this.notifService.showError(
        this.translate.instant('COMMON.ERROR'),
        this.translate.instant('CALENDARIO.ERROR_ASSIGN_TASK'),
      );
    } finally {
      this.assigningTask = false;
    }
  }

  async exportToGoogleCalendar(): Promise<void> {
    if (this.exportingICS) return;
    this.exportingICS = true;
    try {
      await this.exportService.triggerICSDownload(this.weddingId, this.weddingName);
      this.notifService.showSuccess(
        this.translate.instant('CALENDARIO.EXPORT_SUCCESS_TITLE'),
        this.translate.instant('CALENDARIO.EXPORT_SUCCESS_DESC'),
      );
    } catch {
      this.notifService.showError(
        this.translate.instant('COMMON.ERROR'),
        this.translate.instant('CALENDARIO.ERROR_EXPORT_ICS'),
      );
    } finally {
      this.exportingICS = false;
    }
  }

  async exportToPDF(): Promise<void> {
    if (this.isPlanFree) {
      this.notifService.showError(
        this.translate.instant('CALENDARIO.PDF_PLAN_REQUIRED_TITLE'),
        this.translate.instant('CALENDARIO.PDF_PLAN_REQUIRED_DESC'),
      );
      return;
    }
    if (this.exportingPDF) return;
    this.exportingPDF = true;
    try {
      await this.exportService.generateAndDownloadPDF(this.weddingId);
      this.notifService.showSuccess(
        this.translate.instant('CALENDARIO.PDF_SUCCESS_TITLE'),
        this.translate.instant('CALENDARIO.PDF_SUCCESS_DESC'),
      );
    } catch (error: any) {
      this.notifService.showError(
        this.translate.instant('COMMON.ERROR'),
        error?.error?.message ?? this.translate.instant('CALENDARIO.ERROR_EXPORT_PDF'),
      );
    } finally {
      this.exportingPDF = false;
    }
  }
}