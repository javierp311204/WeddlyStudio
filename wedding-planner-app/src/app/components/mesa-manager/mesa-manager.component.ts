import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NotificationService } from '../../services/notification/notification.service';
import { GestionService } from '../../services/gestion/gestion.service';

@Component({
  selector: 'app-mesa-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './mesa-manager.component.html',
  styleUrl: './mesa-manager.component.css',
})
export class MesaManagerComponent implements OnInit {
  mesas: any[] = [];

  invitadosDisponibles: any[] = [];
  invitadosFiltrados: any[] = [];
  busquedaInvitado: string = '';
  invitadoSeleccionado: any = null;

  nuevaMesa: any = { nombre: '', tipo: 'invitados', capacidad: 10 };
  mesaSeleccionada: string = '';

  cargando: boolean = false;

  constructor(
    private gestionService: GestionService,
    private router: Router,
    private notifService: NotificationService,
    private translate: TranslateService,
  ) {}

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    const miCodigo = localStorage.getItem('codigoBoda');
    if (!miCodigo) return;

    this.cargando = true;
    this.gestionService.getConfiguracion(miCodigo).subscribe({
      next: (res: any) => {
        this.mesas = res.mesas || [];
        this.invitadosDisponibles = res.invitados || [];

        this.mesas.forEach((mesa) => {
          mesa.listaInvitados = this.invitadosDisponibles.filter(
            (inv: any) => inv.mesa === mesa.nombre,
          );
        });

        this.cargando = false;
      },
      error: (err: any) => {
        console.error('Error al cargar:', err);
        this.cargando = false;
      },
    });
  }

  filtrarInvitados() {
    console.log('Total invitados disponibles:', this.invitadosDisponibles.length);

    if (!this.busquedaInvitado || this.busquedaInvitado.trim() === '') {
      this.invitadosFiltrados = [];
      return;
    }

    const term = this.busquedaInvitado.toLowerCase().trim();

    this.invitadosFiltrados = this.invitadosDisponibles
      .filter((inv) => {
        const coincideNombre = inv.nombre.toLowerCase().includes(term);
        const sinMesa = !inv.mesa || inv.mesa === '' || inv.mesa === 'Sin Asignar';
        return coincideNombre && sinMesa;
      })
      .slice(0, 5);

    console.log('Resultados encontrados:', this.invitadosFiltrados);
  }

  seleccionarInvitado(inv: any) {
    this.invitadoSeleccionado = inv;
    this.busquedaInvitado = inv.nombre;
    this.invitadosFiltrados = [];
  }

  agregarMesa() {
    const miCodigo = localStorage.getItem('codigoBoda');
    if (!this.nuevaMesa.nombre || !miCodigo) return;

    const datosMesa = { ...this.nuevaMesa, codigoBoda: miCodigo };

    this.gestionService.postMesa(datosMesa).subscribe({
      next: () => {
        this.notifService.showSuccess(
          this.translate.instant('COMMON.SUCCESS'),
          this.translate.instant('TABLES.TABLE_ADDED'),
        );
        this.nuevaMesa = { nombre: '', tipo: 'invitados', capacidad: 10 };
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
    const miCodigo = localStorage.getItem('codigoBoda');
    if (!this.invitadoSeleccionado || !this.mesaSeleccionada || !miCodigo) {
      this.notifService.showError(
        this.translate.instant('TABLES.ATTENTION'),
        this.translate.instant('TABLES.SELECT_GUEST_AND_TABLE'),
      );
      return;
    }

    const idInvitado = this.invitadoSeleccionado._id;
    const datosActualizados = {
      mesa: this.mesaSeleccionada,
      codigoBoda: miCodigo,
    };

    this.gestionService.updateInvitado(idInvitado, datosActualizados).subscribe({
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
    const miCodigo = localStorage.getItem('codigoBoda');
    const mesa = this.mesas.find((m) => m._id === id);

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
        this.translate.instant('TABLES.DELETE_TABLE_DESC', { nombre: mesa?.nombre }),
        'delete',
      )
      .then((confirm) => {
        if (confirm) {
          this.gestionService.deleteMesa(id, miCodigo!).subscribe({
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

  eliminarInvitado(id: string) {
    const miCodigo = localStorage.getItem('codigoBoda');
    if (!miCodigo) return;

    this.notifService
      .askConfirmation(
        this.translate.instant('TABLES.REMOVE_GUEST_TITLE'),
        this.translate.instant('TABLES.REMOVE_GUEST_DESC'),
        'warning',
      )
      .then((confirm) => {
        if (confirm) {
          const datosActualizados = {
            mesa: '',
            codigoBoda: miCodigo,
          };

          this.gestionService.updateInvitado(id, datosActualizados).subscribe({
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

  get tieneMesaPresidencial(): boolean {
    return this.mesas.some((m) => m.tipo === 'novios');
  }

  irAlMenu() {
    this.router.navigate(['/home']);
  }
}