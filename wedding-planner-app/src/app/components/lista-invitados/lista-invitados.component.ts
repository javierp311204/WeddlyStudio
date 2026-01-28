import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GestionService } from '../../services/gestion/gestion.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-lista-invitados',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
    private router: Router,
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

    // 2. Unimos los datos del formulario con el código de la boda
    const datosParaEnviar = {
      ...this.nuevoInvitado,
      codigoBoda: codigo,
    };

    this.gestionService.postInvitado(datosParaEnviar).subscribe({
      next: (res) => {
        console.log('Invitado guardado con éxito');
        this.cargarInvitados(); // Refresca la tabla
        // Limpia el formulario
        this.nuevoInvitado = {
          nombre: '',
          email: '',
          tipo: 'Amigos',
          menu: 'Estándar',
          mesa: '',
        };
      },
      error: (err) => {
        // Aquí es donde te sale el error de tu imagen 3
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

    if (confirm('¿Estás seguro de que quieres eliminar a este invitado?')) {
      // Pasamos el ID en la URL y el codigoBoda como parámetro de consulta
      this.gestionService.deleteInvitado(idInvitado, codigoBoda!).subscribe({
        next: () => {
          // Refrescamos la lista localmente para que desaparezca al instante
          this.invitadosFiltrados = this.invitadosFiltrados.filter(
            (i) => i._id !== idInvitado,
          );
          this.invitados = this.invitados.filter((i) => i._id !== idInvitado);
        },
        error: (err) => console.error('Error al eliminar:', err),
      });
    }
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
