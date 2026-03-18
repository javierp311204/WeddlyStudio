import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { GestionService } from '../../services/gestion/gestion.service';
import { NotificationService } from '../../services/notification/notification.service';
import { Router } from '@angular/router';
import { IconComponent } from '../../shared/icons/icon.component';
import { AiService } from '../../services/ai/ai.service';

@Component({
  selector: 'app-lista-invitados',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, IconComponent],
  templateUrl: './lista-invitados.component.html',
  styleUrl: './lista-invitados.component.css',
})
export class ListaInvitadosComponent implements OnInit {
  invitados: any[] = [];
  invitadosFiltrados: any[] = [];
  terminoBusqueda: string = '';
  filtroTipo: string = 'Todos';
  weddingId: string = '';

  sugerenciaMesa: any = null;
  sugerenciaMesaInvitado: any = null;
  aiLimitReached = false;

  // Modal
  invitadoModal: any | null = null;

  nuevoInvitado = {
    first_name: '',
    last_name: '',
    email: '',
    group: 'Amigos',
    dietary_restrictions: '',
  };

  constructor(
    private gestionService: GestionService,
    private notifService: NotificationService,
    private router: Router,
    private translate: TranslateService,
    private aiService: AiService,
  ) {}

  ngOnInit(): void {
    this.weddingId = localStorage.getItem('weddingId') || '';
    this.cargarInvitados();
  }

  // ── Modal ────────────────────────────────────────────────

  abrirModal(inv: any) {
    this.invitadoModal = inv;
    document.body.style.overflow = 'hidden';
  }

  cerrarModal() {
    this.invitadoModal = null;
    document.body.style.overflow = '';
  }

  // ── CRUD ─────────────────────────────────────────────────

  agregarInvitado() {
    if (!this.weddingId) return;

    this.gestionService.postInvitado(this.weddingId, this.nuevoInvitado).subscribe({
      next: () => {
        this.notifService.showSuccess(
          this.translate.instant('COMMON.SUCCESS'),
          this.translate.instant('GUESTS.GUEST_ADDED'),
        );
        this.cargarInvitados();
        this.nuevoInvitado = {
          first_name: '',
          last_name: '',
          email: '',
          group: 'Amigos',
          dietary_restrictions: '',
        };
      },
      error: (err) => {
        console.error('Error al guardar:', err);
        this.notifService.showError(
          this.translate.instant('COMMON.ERROR'),
          this.translate.instant('NOTIFICATIONS.ERROR_SAVING'),
        );
      },
    });
  }

  cargarInvitados() {
    if (!this.weddingId) return;

    this.gestionService.getInvitados(this.weddingId).subscribe({
      next: (res: any) => {
        const lista = res?.data?.guests ?? res?.guests ?? res ?? [];
        this.invitados = lista;
        this.invitadosFiltrados = lista;
      },
      error: (err) => console.error('Error:', err),
    });
  }

  eliminarInvitado(guestId: string) {
    const inv = this.invitados.find((i) => i.id === guestId);
    const nombreInvitado = inv ? `${inv.first_name} ${inv.last_name}` : '';

    this.notifService
      .askConfirmation(
        this.translate.instant('GUESTS.DELETE_CONFIRM'),
        this.translate.instant('GUESTS.DELETE_CONFIRM_DESC', { nombre: nombreInvitado }),
        'delete',
      )
      .then((confirm) => {
        if (confirm) {
          this.gestionService.deleteInvitado(guestId).subscribe({
            next: () => {
              this.notifService.showSuccess(
                this.translate.instant('NOTIFICATIONS.DELETED'),
                this.translate.instant('GUESTS.GUEST_DELETED'),
              );
              this.cargarInvitados();
            },
            error: (err) => {
              console.error('Error:', err);
              this.notifService.showError(
                this.translate.instant('COMMON.ERROR'),
                this.translate.instant('GUESTS.GUEST_DELETE_ERROR'),
              );
            },
          });
        }
      });
  }

  filtrar() {
    this.invitadosFiltrados = this.invitados.filter((inv) => {
      const nombreCompleto = `${inv.first_name} ${inv.last_name}`.toLowerCase();
      const matchSearch =
        nombreCompleto.includes(this.terminoBusqueda.toLowerCase()) ||
        (inv.email && inv.email.toLowerCase().includes(this.terminoBusqueda.toLowerCase()));
      const matchTipo = this.filtroTipo === 'Todos' || inv.group === this.filtroTipo;
      return matchSearch && matchTipo;
    });
  }

  cambiarFiltro(tipo: string) {
    this.filtroTipo = tipo;
    this.filtrar();
  }

  sugerirMesaParaInvitado(inv: any): void {
    if (this.aiLimitReached) {
      this.notifService.showError('⚠️ Límite IA', 'Has agotado las sugerencias de este mes.');
      return;
    }
 
    this.notifService.showSuccess('✨', 'Analizando la mejor mesa...');
 
    this.aiService.suggestTableForGuest(this.weddingId, inv.id).subscribe({
      next: (res: any) => {
        this.sugerenciaMesa         = res?.data?.suggestion;
        this.sugerenciaMesaInvitado = inv;
 
        const usage = res?.data?.usage;
        if (usage && !usage.unlimited) {
          this.aiLimitReached = (usage.remaining ?? 1) <= 0;
        }
      },
      error: (err: any) => {
        if (err?.error?.code === 'AI_LIMIT_REACHED') {
          this.aiLimitReached = true;
          this.notifService.showError('⚠️ Límite IA', 'Has agotado las sugerencias de este mes.');
        } else {
          this.notifService.showError('Error', 'No se pudo obtener una sugerencia');
        }
      },
    });
  }
 
  aceptarSugerenciaMesa(): void {
    if (!this.sugerenciaMesa || !this.sugerenciaMesaInvitado) return;
 
    // Usar GestionService o HttpClient para asignar — depende de lo que tengas
    // Llamar al endpoint PATCH /api/tables/:tableId/assign
    const tableId  = this.sugerenciaMesa.table_id;
    const guestId  = this.sugerenciaMesaInvitado.id;
 
    this.gestionService.asignarInvitado(tableId, guestId).subscribe({
      next: () => {
        this.notifService.showSuccess('✓', `${this.sugerenciaMesaInvitado.first_name} asignado a ${this.sugerenciaMesa.table_name}`);
        this.sugerenciaMesa         = null;
        this.sugerenciaMesaInvitado = null;
        this.cargarInvitados();
      },
      error: (err: any) => {
        this.notifService.showError('Error', err?.error?.message || 'No se pudo asignar la mesa');
      },
    });
  }

  // ── Helpers ──────────────────────────────────────────────

  getNombreCompleto(inv: any): string {
    return `${inv.first_name || ''} ${inv.last_name || ''}`.trim();
  }

  getInicial(inv: any): string {
    return (inv.first_name || '?').charAt(0).toUpperCase();
  }

  getRsvpLabel(status: string): string {
    const map: Record<string, string> = {
      confirmed: this.translate.instant('PLANO.RSVP_CONFIRMED'),
      pending:   this.translate.instant('GUESTS.PENDING'),
      declined:  this.translate.instant('PLANO.RSVP_DECLINED'),
    };
    return map[status] || status;
  }
}