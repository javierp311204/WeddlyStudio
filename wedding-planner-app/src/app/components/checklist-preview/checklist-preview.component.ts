import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { TareasService, EstadisticasChecklist } from '../../services/tareas/tareas.service';

@Component({
  selector: 'app-checklist-preview',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './checklist-preview.component.html',
  styleUrl: './checklist-preview.component.css'
})
export class ChecklistPreviewComponent implements OnInit {
  estadisticas: EstadisticasChecklist | null = null;
  cargando = true;

  constructor(private tareasService: TareasService) {}

  ngOnInit() {
    const codigoBoda = localStorage.getItem('codigoBoda') || '';
    if (!codigoBoda) return;

    this.tareasService.getEstadisticas(codigoBoda).subscribe({
      next: (stats) => {
        this.estadisticas = stats;
        this.cargando = false;
      },
      error: () => this.cargando = false
    });
  }
}