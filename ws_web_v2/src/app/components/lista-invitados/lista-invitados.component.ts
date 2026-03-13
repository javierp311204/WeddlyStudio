import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { GestionService } from '../../services/gestion/gestion.service';
import { NotificationService } from '../../services/notification/notification.service';
import { Router } from '@angular/router';
import { IconComponent } from '../../shared/icons/icon.component';

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

  // ── Helpers ──────────────────────────────────────────────

  getNombreCompleto(inv: any): string {
    return `${inv.first_name || ''} ${inv.last_name || ''}`.trim();
  }

  getInicial(inv: any): string {
    return (inv.first_name || '?').charAt(0).toUpperCase();
  }

  getRsvpLabel(status: string): string {
    const map: Record<string, string> = {
      confirmed: 'Confirmado',
      pending:   'Pendiente',
      declined:  'Declinado',
    };
    return map[status] || status;
  }
}