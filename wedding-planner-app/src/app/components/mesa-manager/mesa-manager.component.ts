import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NotificationService } from '../../services/notification/notification.service';
import { GestionService } from '../../services/gestion/gestion.service';

@Component({
  selector: 'app-mesa-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mesa-manager.component.html',
  styleUrl: './mesa-manager.component.css',
})
export class MesaManagerComponent implements OnInit {
  mesas: any[] = [];

  // Lógica de búsqueda de invitados
  invitadosDisponibles: any[] = []; // Todos los invitados de la boda
  invitadosFiltrados: any[] = []; // Los que coinciden con la búsqueda
  busquedaInvitado: string = ''; // Texto del input
  invitadoSeleccionado: any = null; // El objeto invitado elegido

  // Modelos de formulario
  nuevaMesa: any = { nombre: '', tipo: 'invitados', capacidad: 10 };
  mesaSeleccionada: string = '';

  cargando: boolean = false;

  constructor(
    private gestionService: GestionService,
    private router: Router,
    private notifService: NotificationService,
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

        // Vinculación lógica: Invitados -> Mesas
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

  // --- Lógica del Buscador ---
  filtrarInvitados() {
    // 1. Verificar si hay invitados cargados en la consola
    console.log(
      'Total invitados disponibles:',
      this.invitadosDisponibles.length,
    );

    if (!this.busquedaInvitado || this.busquedaInvitado.trim() === '') {
      this.invitadosFiltrados = [];
      return;
    }

    const term = this.busquedaInvitado.toLowerCase().trim();

    this.invitadosFiltrados = this.invitadosDisponibles
      .filter((inv) => {
        const coincideNombre = inv.nombre.toLowerCase().includes(term);
        // IMPORTANTE: Verifica que no tenga mesa o que la propiedad mesa esté vacía
        const sinMesa =
          !inv.mesa || inv.mesa === '' || inv.mesa === 'Sin Asignar';

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

  // --- Acciones ---
  agregarMesa() {
    const miCodigo = localStorage.getItem('codigoBoda');
    if (!this.nuevaMesa.nombre || !miCodigo) return;

    const datosMesa = { ...this.nuevaMesa, codigoBoda: miCodigo };

    this.gestionService.postMesa(datosMesa).subscribe({
      next: () => {
        this.notifService.showSuccess('¡Éxito!', 'Mesa añadida.');
        this.nuevaMesa = { nombre: '', tipo: 'invitados', capacidad: 10 };
        this.cargarDatos();
      },
      error: () =>
        this.notifService.showError('Error', 'No se pudo crear la mesa.'),
    });
  }

  agregarInvitadoAMesa() {
    const miCodigo = localStorage.getItem('codigoBoda');
    if (!this.invitadoSeleccionado || !this.mesaSeleccionada || !miCodigo) {
      this.notifService.showError(
        'Atención',
        'Selecciona un invitado válido y una mesa.',
      );
      return;
    }

    const idInvitado = this.invitadoSeleccionado._id;
    const datosActualizados = {
      mesa: this.mesaSeleccionada,
      codigoBoda: miCodigo,
    };

    this.gestionService
      .updateInvitado(idInvitado, datosActualizados)
      .subscribe({
        next: () => {
          this.notifService.showSuccess(
            '¡Éxito!',
            'Invitado asignado a la mesa.',
          );
          this.limpiarFormularioInvitado();
          this.cargarDatos();
        },
        error: (err) => {
          console.error('Error al asignar:', err);
          this.notifService.showError(
            'Error',
            'No se pudo asignar el invitado.',
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

    // Buscar la mesa por su _id
    const mesa = this.mesas.find((m) => m._id === id);

    // Verificar si tiene invitados sentados
    if (mesa && mesa.listaInvitados && mesa.listaInvitados.length > 0) {
      this.notifService.showError(
        'Mesa ocupada',
        `Hay ${mesa.listaInvitados.length} invitado(s) sentados. Reasígnalos primero.`,
      );
      return;
    }

    // Si no tiene invitados, proceder con la confirmación
    this.notifService
      .askConfirmation(
        'Eliminar Mesa',
        `¿Estás seguro de eliminar "${mesa?.nombre}"?`,
        'delete',
      )
      .then((confirm) => {
        if (confirm) {
          this.gestionService.deleteMesa(id, miCodigo!).subscribe({
            next: () => {
              this.notifService.showSuccess(
                'Eliminada',
                'Mesa eliminada correctamente.',
              );
              this.cargarDatos();
            },
            error: (err) => {
              console.error('Error al eliminar mesa:', err);
              this.notifService.showError(
                'Error',
                'No se pudo eliminar la mesa.',
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
        'Quitar de la mesa',
        '¿Deseas quitar este invitado de la mesa?',
        'warning',
      )
      .then((confirm) => {
        if (confirm) {
          // En lugar de eliminar, actualizamos para quitar la mesa
          const datosActualizados = {
            mesa: '', // o 'Sin Asignar'
            codigoBoda: miCodigo,
          };

          this.gestionService.updateInvitado(id, datosActualizados).subscribe({
            next: () => {
              this.notifService.showSuccess(
                'Quitado',
                'Invitado removido de la mesa.',
              );
              this.cargarDatos();
            },
            error: (err) => {
              console.error('Error al quitar invitado:', err);
              this.notifService.showError(
                'Error',
                'No se pudo quitar de la mesa.',
              );
            },
          });
        }
      });
  }

  // --- Getters ---
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
