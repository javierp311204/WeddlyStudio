import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { TareasService } from '../../services/tareas/tareas.service';

// ─────────────────────────────────────────────────────────────
// MIGRACIÓN v2:
//  • codigoBoda → weddingId (UUID)
//  • getEstadisticas() ya no existe como endpoint separado.
//    Se llama getChecklist() que devuelve { tasks, grouped, totals }.
//    Las estadísticas vienen en `totals`.
//  • Campos de totals v2:
//      total, completed, in_progress, pending, cancelled, percentage
//    (antes: total, completadas, enProgreso, pendientes, porcentajeTotal)
// ─────────────────────────────────────────────────────────────

@Component({
  selector: 'app-checklist-preview',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './checklist-preview.component.html',
  styleUrl: './checklist-preview.component.css'
})
export class ChecklistPreviewComponent implements OnInit {
  // v2: renombrado para claridad
  totals: any = null;
  cargando = true;

  // Alias para retrocompatibilidad con el template anterior
  get estadisticas() { return this.totals; }

  constructor(private tareasService: TareasService) {}

  ngOnInit() {
    const weddingId = localStorage.getItem('weddingId') || '';
    if (!weddingId) {
      this.cargando = false;
      return;
    }

    this.tareasService.getChecklist(weddingId).subscribe({
      next: (res: any) => {
        const t = res?.totals ?? res?.data?.totals ?? null;
        if (t) {
          // Calcular percentage aquí ya que el backend no lo devuelve
          t.percentage = t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0;
        }
        this.totals = t;
        this.cargando = false;
      },
      error: () => { this.cargando = false; }
    });
  }
}