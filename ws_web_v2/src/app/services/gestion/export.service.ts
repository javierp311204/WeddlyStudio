// src/app/services/gestion/export.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PDFExportData {
  wedding: {
    id: string;
    name: string;
    wedding_date: string;
    location_name?: string;
    plan_type: string;
  };
  tasks: any[];
  grouped: Record<string, any[]>;
  events: any[];
  totals: {
    total: number;
    completed: number;
    in_progress: number;
    pending: number;
    cancelled: number;
  };
  generated_at: string;
}

@Injectable({ providedIn: 'root' })
export class ExportService {
  private apiUrl = 'https://weddly-api-production.up.railway.app/api';

  constructor(private http: HttpClient) {}

  /**
   * Descarga el archivo .ics para importar en Google Calendar / Apple Calendar
   */
  downloadICS(weddingId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/weddings/${weddingId}/export/ics`, {
      responseType: 'blob',
    });
  }

  /**
   * Obtiene los datos estructurados para generar el PDF en el frontend
   * Requiere plan one_time o subscription — el backend devuelve 403 si es free
   */
  getPDFData(weddingId: string): Observable<{ success: boolean; data: PDFExportData }> {
    return this.http.get<{ success: boolean; data: PDFExportData }>(
      `${this.apiUrl}/weddings/${weddingId}/export/pdf-data`,
    );
  }

  /**
   * Descarga el .ics y dispara el diálogo de descarga en el navegador
   */
  triggerICSDownload(weddingId: string, weddingName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.downloadICS(weddingId).subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `weddly-${weddingName.toLowerCase().replace(/\s+/g, '-')}.ics`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          resolve();
        },
        error: reject,
      });
    });
  }

  /**
   * Genera y descarga el PDF en el navegador usando los datos del backend
   */
  async generateAndDownloadPDF(weddingId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.getPDFData(weddingId).subscribe({
        next: (response) => {
          this.buildPDFFromData(response.data);
          resolve();
        },
        error: reject,
      });
    });
  }

  /**
   * Construye el HTML del PDF y usa window.print() para generar el PDF
   * No requiere dependencias externas
   */
  private buildPDFFromData(data: PDFExportData): void {
    const phaseLabels: Record<string, string> = {
      '12_months': '12 meses antes',
      '9_months': '9 meses antes',
      '6_months': '6 meses antes',
      '3_months': '3 meses antes',
      '1_month': '1 mes antes',
      '1_week': '1 semana antes',
      'sin_fase': 'Sin fase',
    };

    const phaseOrder = ['12_months', '9_months', '6_months', '3_months', '1_month', '1_week', 'sin_fase'];

    const statusLabel: Record<string, string> = {
      pending: 'Pendiente',
      in_progress: 'En progreso',
      completed: 'Completada',
      cancelled: 'Cancelada',
    };

    const statusColor: Record<string, string> = {
      pending: '#94a3b8',
      in_progress: '#f59e0b',
      completed: '#10b981',
      cancelled: '#ef4444',
    };

    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return '—';
      return new Date(dateStr).toLocaleDateString('es-ES', {
        day: '2-digit', month: 'long', year: 'numeric',
      });
    };

    const progressPct = data.totals.total > 0
      ? Math.round((data.totals.completed / data.totals.total) * 100)
      : 0;

    let phaseSections = '';
    for (const phaseKey of phaseOrder) {
      const tasks = data.grouped[phaseKey];
      if (!tasks || tasks.length === 0) continue;

      const phaseCompleted = tasks.filter((t: any) => t.status === 'completed').length;
      const phaseProgress = Math.round((phaseCompleted / tasks.length) * 100);

      const taskRows = tasks.map((task: any) => `
        <tr class="task-row ${task.status === 'completed' ? 'done' : ''}">
          <td class="check-col">
            <span class="check-circle ${task.status === 'completed' ? 'checked' : ''}">
              ${task.status === 'completed' ? '✓' : ''}
            </span>
          </td>
          <td class="title-col">
            <span class="task-title ${task.status === 'completed' ? 'strikethrough' : ''}">${task.title}</span>
            ${task.description ? `<span class="task-desc">${task.description}</span>` : ''}
          </td>
          <td class="category-col">${task.category ?? '—'}</td>
          <td class="date-col">${formatDate(task.due_date)}</td>
          <td class="status-col">
            <span class="status-pill" style="background:${statusColor[task.status]}20; color:${statusColor[task.status]}; border:1px solid ${statusColor[task.status]}40">
              ${statusLabel[task.status] ?? task.status}
            </span>
          </td>
        </tr>
      `).join('');

      phaseSections += `
        <div class="phase-section">
          <div class="phase-header">
            <h3 class="phase-title">${phaseLabels[phaseKey] ?? phaseKey}</h3>
            <div class="phase-meta">
              <span class="phase-count">${phaseCompleted}/${tasks.length} completadas</span>
              <div class="mini-progress">
                <div class="mini-progress-fill" style="width:${phaseProgress}%"></div>
              </div>
            </div>
          </div>
          <table class="tasks-table">
            <thead>
              <tr>
                <th style="width:32px"></th>
                <th>Tarea</th>
                <th>Categoría</th>
                <th>Fecha límite</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>${taskRows}</tbody>
          </table>
        </div>
      `;
    }

    let eventsSection = '';
    if (data.events && data.events.length > 0) {
      const eventRows = data.events.map((ev: any) => `
        <tr>
          <td>${ev.title}</td>
          <td>${formatDate(ev.start_date)}</td>
          <td>${ev.end_date ? formatDate(ev.end_date) : '—'}</td>
          <td>${ev.description ?? '—'}</td>
        </tr>
      `).join('');

      eventsSection = `
        <div class="phase-section">
          <div class="phase-header">
            <h3 class="phase-title">🎉 Hitos del evento</h3>
          </div>
          <table class="tasks-table">
            <thead>
              <tr>
                <th>Evento</th>
                <th>Inicio</th>
                <th>Fin</th>
                <th>Descripción</th>
              </tr>
            </thead>
            <tbody>${eventRows}</tbody>
          </table>
        </div>
      `;
    }

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Weddly — ${data.wedding.name}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'DM Sans', sans-serif;
    color: #1a1a2e;
    background: #fff;
    font-size: 11px;
    line-height: 1.5;
  }

  .pdf-cover {
    padding: 48px 56px 40px;
    border-bottom: 2px solid #f0e6e6;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .cover-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 32px;
    font-weight: 600;
    color: #1a1a2e;
    letter-spacing: -0.5px;
    margin-bottom: 6px;
  }

  .cover-subtitle {
    font-size: 12px;
    color: #8b7474;
    margin-bottom: 4px;
  }

  .cover-meta {
    font-size: 11px;
    color: #aaa;
  }

  .brand {
    font-family: 'Cormorant Garamond', serif;
    font-size: 14px;
    color: #c9a96e;
    font-weight: 500;
    text-align: right;
  }

  .stats-bar {
    display: flex;
    gap: 0;
    padding: 20px 56px;
    background: #faf8f5;
    border-bottom: 1px solid #f0e6e6;
  }

  .stat-block {
    flex: 1;
    padding: 12px 20px;
    border-right: 1px solid #ede8e0;
  }

  .stat-block:last-child { border-right: none; }

  .stat-num {
    font-family: 'Cormorant Garamond', serif;
    font-size: 28px;
    font-weight: 600;
    color: #1a1a2e;
    line-height: 1;
    margin-bottom: 3px;
  }

  .stat-label {
    font-size: 10px;
    color: #8b7474;
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }

  .progress-bar-wrap {
    height: 4px;
    background: #ede8e0;
    border-radius: 2px;
    margin-top: 4px;
    overflow: hidden;
  }

  .progress-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #c9a96e, #e8c99a);
    border-radius: 2px;
  }

  .content {
    padding: 32px 56px;
  }

  .phase-section {
    margin-bottom: 32px;
    break-inside: avoid;
  }

  .phase-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1.5px solid #f0e6e6;
  }

  .phase-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 16px;
    font-weight: 600;
    color: #1a1a2e;
    letter-spacing: -0.2px;
  }

  .phase-meta {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .phase-count {
    font-size: 10px;
    color: #8b7474;
  }

  .mini-progress {
    width: 80px;
    height: 3px;
    background: #ede8e0;
    border-radius: 2px;
    overflow: hidden;
  }

  .mini-progress-fill {
    height: 100%;
    background: #c9a96e;
    border-radius: 2px;
  }

  .tasks-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10.5px;
  }

  .tasks-table thead tr {
    background: #faf8f5;
  }

  .tasks-table th {
    padding: 7px 10px;
    text-align: left;
    font-size: 9px;
    font-weight: 500;
    color: #8b7474;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    border-bottom: 1px solid #ede8e0;
  }

  .tasks-table td {
    padding: 8px 10px;
    border-bottom: 1px solid #f5f0eb;
    vertical-align: top;
  }

  .task-row.done td {
    opacity: 0.65;
  }

  .check-circle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border: 1.5px solid #c9a96e;
    border-radius: 50%;
    font-size: 9px;
    color: #c9a96e;
    font-weight: 700;
  }

  .check-circle.checked {
    background: #c9a96e;
    color: #fff;
  }

  .task-title {
    display: block;
    font-weight: 500;
    color: #1a1a2e;
  }

  .task-title.strikethrough {
    text-decoration: line-through;
    color: #aaa;
  }

  .task-desc {
    display: block;
    font-size: 9.5px;
    color: #8b7474;
    margin-top: 2px;
    line-height: 1.4;
  }

  .status-pill {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 999px;
    font-size: 9px;
    font-weight: 500;
    white-space: nowrap;
  }

  .footer {
    padding: 16px 56px;
    border-top: 1px solid #f0e6e6;
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: #ccc;
    margin-top: 16px;
  }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .phase-section { break-inside: avoid; }
  }
</style>
</head>
<body>

<div class="pdf-cover">
  <div>
    <div class="cover-title">${data.wedding.name}</div>
    <div class="cover-subtitle">
      ${data.wedding.wedding_date ? `📅 ${formatDate(data.wedding.wedding_date)}` : ''}
      ${data.wedding.location_name ? ` · 📍 ${data.wedding.location_name}` : ''}
    </div>
    <div class="cover-meta">Exportado el ${formatDate(data.generated_at)} · Weddly Checklist</div>
  </div>
  <div class="brand">Weddly</div>
</div>

<div class="stats-bar">
  <div class="stat-block">
    <div class="stat-num">${data.totals.total}</div>
    <div class="stat-label">Total tareas</div>
  </div>
  <div class="stat-block">
    <div class="stat-num" style="color:#10b981">${data.totals.completed}</div>
    <div class="stat-label">Completadas</div>
  </div>
  <div class="stat-block">
    <div class="stat-num" style="color:#f59e0b">${data.totals.in_progress}</div>
    <div class="stat-label">En progreso</div>
  </div>
  <div class="stat-block">
    <div class="stat-num" style="color:#94a3b8">${data.totals.pending}</div>
    <div class="stat-label">Pendientes</div>
  </div>
  <div class="stat-block">
    <div class="stat-num" style="color:#c9a96e">${progressPct}%</div>
    <div class="stat-label">Progreso</div>
    <div class="progress-bar-wrap" style="margin-top:6px">
      <div class="progress-bar-fill" style="width:${progressPct}%"></div>
    </div>
  </div>
</div>

<div class="content">
  ${phaseSections}
  ${eventsSection}
</div>

<div class="footer">
  <span>Weddly — Wedding Planner</span>
  <span>Generado el ${new Date(data.generated_at).toLocaleString('es-ES')}</span>
</div>

</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 800);
  }
}