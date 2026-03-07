import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { GestionService } from '../../services/gestion/gestion.service';
import { NotificationService } from '../../services/notification/notification.service';
import { Router } from '@angular/router';

// ─────────────────────────────────────────────────────────────
// MIGRACIÓN v2:
//  • codigoBoda         → weddingId  (UUID)
//  • inv._id            → inv.id
//  • inv.nombre         → inv.first_name + inv.last_name
//  • inv.confirmado     → inv.rsvp_status ('confirmed'|'pending'|'declined')
//  • inv.tipo           → inv.group (campo de agrupación libre, si lo usas)
//  • GET  /gestion/invitados?codigoBoda= → GET  /api/weddings/:weddingId/guests
//  • POST /gestion/invitados             → POST /api/weddings/:weddingId/guests
//  • PUT  /gestion/invitados/:id         → PATCH /api/guests/:guestId
//  • DELETE /gestion/invitados/:id       → DELETE /api/guests/:guestId
//
//  NOTA: el filtro por "tipo" de antes no tiene un campo equivalente directo
//  en v2; se puede usar un campo custom o el grupo. Aquí se conserva la UI
//  pero filtra sobre `inv.group` en lugar de `inv.tipo`.
// ─────────────────────────────────────────────────────────────

@Component({
  selector: 'app-lista-invitados',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './lista-invitados.component.html',
  styleUrl: './lista-invitados.component.css',
})
export class ListaInvitadosComponent implements OnInit {
  invitados: any[] = [];
  invitadosFiltrados: any[] = [];
  terminoBusqueda: string = '';
  filtroTipo: string = 'Todos';
  weddingId: string = '';   // antes: codigoBoda

  nuevoInvitado = {
    first_name: '',
    last_name: '',
    email: '',
    group: 'Amigos',   // campo libre en v2 (antes: tipo)
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

  agregarInvitado() {
    if (!this.weddingId) {
      console.error('No se encontró el weddingId');
      return;
    }

    // v2: POST /api/weddings/:weddingId/guests
    // Body: { first_name, last_name, email, group, dietary_restrictions, ... }
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

    // v2: GET /api/weddings/:weddingId/guests → { guests, totals }
    this.gestionService.getInvitados(this.weddingId).subscribe({
      next: (res: any) => {
        // v2 devuelve { success, data: { guests, totals } }
        const lista = res?.data?.guests ?? res?.guests ?? res ?? [];
        this.invitados = lista;
        this.invitadosFiltrados = lista;
      },
      error: (err) => console.error('Error:', err),
    });
  }

  eliminarInvitado(guestId: string) {
    // v2: buscar por id (antes _id)
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
          // v2: DELETE /api/guests/:guestId  (sin codigoBoda en query)
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
      // v2: buscar sobre first_name + last_name
      const nombreCompleto = `${inv.first_name} ${inv.last_name}`.toLowerCase();
      const matchSearch =
        nombreCompleto.includes(this.terminoBusqueda.toLowerCase()) ||
        (inv.email &&
          inv.email.toLowerCase().includes(this.terminoBusqueda.toLowerCase()));
      // v2: filtrar por inv.group en lugar de inv.tipo
      const matchTipo =
        this.filtroTipo === 'Todos' || inv.group === this.filtroTipo;
      return matchSearch && matchTipo;
    });
  }

  cambiarFiltro(tipo: string) {
    this.filtroTipo = tipo;
    this.filtrar();
  }

  // Helper: nombre completo para el template
  getNombreCompleto(inv: any): string {
    return `${inv.first_name || ''} ${inv.last_name || ''}`.trim();
  }

  // Helper: inicial para el avatar
  getInicial(inv: any): string {
    return (inv.first_name || '?').charAt(0).toUpperCase();
  }

  // Helper: traduce rsvp_status a label
  getRsvpLabel(status: string): string {
    const map: Record<string, string> = {
      confirmed: 'Confirmado',
      pending:   'Pendiente',
      declined:  'Declinado',
    };
    return map[status] || status;
  }
}