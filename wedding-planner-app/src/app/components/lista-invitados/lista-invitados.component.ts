import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { GestionService } from '../../services/gestion/gestion.service';
import { NotificationService } from '../../services/notification/notification.service';
import { Router } from '@angular/router';

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
  codigoBoda: string = '';

  nuevoInvitado = {
    nombre: '',
    email: '',
    tipo: 'Amigos',
    menu: 'Estándar',
    mesa: '',
  };

  constructor(
    private gestionService: GestionService,
    private notifService: NotificationService,
    private router: Router,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.codigoBoda = localStorage.getItem('codigoBoda') || '';
    this.cargarInvitados();
  }

  irAlHome() {
    this.router.navigate(['/home']);
  }

  agregarInvitado() {
    const codigo = localStorage.getItem('codigoBoda');

    if (!codigo) {
      console.error('No se encontró el código de la boda en el almacenamiento');
      return;
    }

    const datosParaEnviar = {
      ...this.nuevoInvitado,
      codigoBoda: codigo,
    };

    this.gestionService.postInvitado(datosParaEnviar).subscribe({
      next: (res) => {
        this.notifService.showSuccess(
          this.translate.instant('COMMON.SUCCESS'),
          this.translate.instant('GUESTS.GUEST_ADDED'),
        );
        this.cargarInvitados();
        this.nuevoInvitado = {
          nombre: '',
          email: '',
          tipo: 'Amigos',
          menu: 'Estándar',
          mesa: '',
        };
      },
      error: (err) => {
        console.error('Error al guardar:', err);
      },
    });
  }

  cargarInvitados() {
    const codigo = localStorage.getItem('codigoBoda');
    if (codigo) {
      this.gestionService.getInvitados(codigo).subscribe({
        next: (res) => {
          this.invitados = res;
          this.invitadosFiltrados = res;
        },
        error: (err) => console.error('Error:', err),
      });
    }
  }

  eliminarInvitado(idInvitado: string) {
    const codigoBoda = localStorage.getItem('codigoBoda');
    const nombreInvitado = this.invitados.find((i) => i._id === idInvitado)?.nombre;

    this.notifService
      .askConfirmation(
        this.translate.instant('GUESTS.DELETE_CONFIRM'),
        this.translate.instant('GUESTS.DELETE_CONFIRM_DESC', { nombre: nombreInvitado }),
        'delete',
      )
      .then((confirm) => {
        if (confirm) {
          this.gestionService
            .deleteInvitado(idInvitado, codigoBoda!)
            .subscribe({
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
      const matchSearch =
        inv.nombre.toLowerCase().includes(this.terminoBusqueda.toLowerCase()) ||
        (inv.email &&
          inv.email.toLowerCase().includes(this.terminoBusqueda.toLowerCase()));
      const matchTipo =
        this.filtroTipo === 'Todos' || inv.tipo === this.filtroTipo;
      return matchSearch && matchTipo;
    });
  }

  cambiarFiltro(tipo: string) {
    this.filtroTipo = tipo;
    this.filtrar();
  }
}