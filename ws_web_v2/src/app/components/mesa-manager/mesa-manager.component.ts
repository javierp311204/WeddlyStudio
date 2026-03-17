import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NotificationService } from '../../services/notification/notification.service';
import { GestionService } from '../../services/gestion/gestion.service';
import { IconComponent } from '../../shared/icons/icon.component';

@Component({
  selector: 'app-mesa-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, IconComponent],
  templateUrl: './mesa-manager.component.html',
  styleUrl: './mesa-manager.component.css',
})
export class MesaManagerComponent implements OnInit {
  mesas: any[] = [];

  invitadosDisponibles: any[] = [];
  invitadosFiltrados: any[] = [];
  busquedaInvitado: string = '';
  invitadoSeleccionado: any = null;

  // v2: shape en lugar de tipo
  nuevaMesa: any = { name: '', shape: 'round', max_capacity: 10 };
  mesaSeleccionada: string = '';   // tableId UUID

  cargando: boolean = false;
  weddingId: string = '';

  constructor(
    private gestionService: GestionService,
    private router: Router,
    private notifService: NotificationService,
    private translate: TranslateService,
  ) {}

  ngOnInit() {
    this.weddingId = localStorage.getItem('weddingId') || '';
    this.cargarDatos();
  }

  cargarDatos() {
    if (!this.weddingId) return;
    this.cargando = true;

    // v2: GET /api/weddings/:weddingId/tables — firma: getMesas(weddingId)
    this.gestionService.getMesas(this.weddingId).subscribe({
      next: (resTables: any) => {
        const tables = resTables?.data?.tables ?? resTables?.tables ?? resTables ?? [];
        this.mesas = tables.map((t: any) => ({
          ...t,
          listaInvitados: [],
        }));

        // Cargar invitados para cruzar con mesas
        this.gestionService.getInvitados(this.weddingId).subscribe({
          next: (resGuests: any) => {
            this.invitadosDisponibles = resGuests?.data?.guests ?? resGuests?.guests ?? resGuests ?? [];

            // Cruzar: añadir invitados a su mesa
            this.mesas.forEach((mesa: any) => {
              mesa.listaInvitados = this.invitadosDisponibles.filter(
                (inv: any) => inv.table_id === mesa.id,
              );
            });

            this.cargando = false;
          },
          error: () => { this.cargando = false; },
        });
      },
      error: (err: any) => {
        console.error('Error al cargar mesas:', err);
        this.cargando = false;
      },
    });
  }

  filtrarInvitados() {
    if (!this.busquedaInvitado || this.busquedaInvitado.trim() === '') {
      this.invitadosFiltrados = [];
      return;
    }

    const term = this.busquedaInvitado.toLowerCase().trim();

    this.invitadosFiltrados = this.invitadosDisponibles
      .filter((inv) => {
        // v2: buscar en first_name + last_name
        const nombre = `${inv.first_name} ${inv.last_name}`.toLowerCase();
        const sinMesa = !inv.table_id;
        return nombre.includes(term) && sinMesa;
      })
      .slice(0, 5);
  }

  seleccionarInvitado(inv: any) {
    this.invitadoSeleccionado = inv;
    this.busquedaInvitado = `${inv.first_name} ${inv.last_name}`.trim();
    this.invitadosFiltrados = [];
  }

  agregarMesa() {
    if (!this.nuevaMesa.name || !this.weddingId) return;

    // v2: POST /api/weddings/:weddingId/tables — firma: postMesa(weddingId, mesa)
    this.gestionService.postMesa(this.weddingId, this.nuevaMesa).subscribe({
      next: () => {
        this.notifService.showSuccess(
          this.translate.instant('COMMON.SUCCESS'),
          this.translate.instant('TABLES.TABLE_ADDED'),
        );
        this.nuevaMesa = { name: '', shape: 'round', max_capacity: 10 };
        this.cargarDatos();
      },
      error: () =>
        this.notifService.showError(
          this.translate.instant('COMMON.ERROR'),
          this.translate.instant('TABLES.TABLE_ADD_ERROR'),
        ),
    });
  }

  agregarInvitadoAMesa() {
    if (!this.invitadoSeleccionado || !this.mesaSeleccionada) {
      this.notifService.showError(
        this.translate.instant('TABLES.ATTENTION'),
        this.translate.instant('TABLES.SELECT_GUEST_AND_TABLE'),
      );
      return;
    }

    // v2: PATCH /api/tables/:tableId/assign — firma: asignarInvitado(tableId, guestId)
    this.gestionService
      .asignarInvitado(this.mesaSeleccionada, this.invitadoSeleccionado.id)
      .subscribe({
        next: () => {
          this.notifService.showSuccess(
            this.translate.instant('COMMON.SUCCESS'),
            this.translate.instant('TABLES.GUEST_ASSIGNED'),
          );
          this.limpiarFormularioInvitado();
          this.cargarDatos();
        },
        error: (err) => {
          console.error('Error al asignar:', err);
          this.notifService.showError(
            this.translate.instant('COMMON.ERROR'),
            this.translate.instant('TABLES.GUEST_ASSIGN_ERROR'),
          );
        },
      });
  }

  limpiarFormularioInvitado() {
    this.invitadoSeleccionado = null;
    this.busquedaInvitado = '';
    this.mesaSeleccionada = '';
    this.invitadosFiltrados = [];
  }

  eliminarMesa(id: string) {
    const mesa = this.mesas.find((m) => m.id === id);

    if (mesa && mesa.listaInvitados && mesa.listaInvitados.length > 0) {
      this.notifService.showError(
        this.translate.instant('TABLES.TABLE_OCCUPIED_TITLE'),
        this.translate.instant('TABLES.TABLE_OCCUPIED_DESC', { count: mesa.listaInvitados.length }),
      );
      return;
    }

    this.notifService
      .askConfirmation(
        this.translate.instant('TABLES.DELETE_TABLE_TITLE'),
        this.translate.instant('TABLES.DELETE_TABLE_DESC', { nombre: mesa?.name }),
        'delete',
      )
      .then((confirm) => {
        if (confirm) {
          // v2: DELETE /api/tables/:tableId — firma: deleteMesa(tableId)
          this.gestionService.deleteMesa(id).subscribe({
            next: () => {
              this.notifService.showSuccess(
                this.translate.instant('NOTIFICATIONS.DELETED'),
                this.translate.instant('TABLES.TABLE_DELETED'),
              );
              this.cargarDatos();
            },
            error: (err) => {
              console.error('Error al eliminar mesa:', err);
              this.notifService.showError(
                this.translate.instant('COMMON.ERROR'),
                this.translate.instant('TABLES.TABLE_DELETE_ERROR'),
              );
            },
          });
        }
      });
  }

  eliminarInvitado(guestId: string, tableId: string) {
    this.notifService
      .askConfirmation(
        this.translate.instant('TABLES.REMOVE_GUEST_TITLE'),
        this.translate.instant('TABLES.REMOVE_GUEST_DESC'),
        'warning',
      )
      .then((confirm) => {
        if (confirm) {
          // v2: PATCH /api/tables/:tableId/unassign/:guestId — firma: quitarInvitado(tableId, guestId)
          this.gestionService.quitarInvitado(tableId, guestId).subscribe({
            next: () => {
              this.notifService.showSuccess(
                this.translate.instant('TABLES.GUEST_REMOVED_TITLE'),
                this.translate.instant('TABLES.GUEST_REMOVED_DESC'),
              );
              this.cargarDatos();
            },
            error: (err) => {
              console.error('Error al quitar invitado:', err);
              this.notifService.showError(
                this.translate.instant('COMMON.ERROR'),
                this.translate.instant('TABLES.GUEST_REMOVE_ERROR'),
              );
            },
          });
        }
      });
  }

  get totalInvitados(): number {
    return this.mesas.reduce(
      (acc, m) => acc + (m.listaInvitados?.length || 0),
      0,
    );
  }

  get totalMesas(): number {
    return this.mesas.length;
  }

  // v2: no hay campo tipo 'novios'; se puede usar shape o un campo custom
  get tieneMesaPresidencial(): boolean {
    return this.mesas.some((m) => m.is_presidential === true);
  }

  getNombreCompleto(inv: any): string {
    return `${inv.first_name || ''} ${inv.last_name || ''}`.trim();
  }

}