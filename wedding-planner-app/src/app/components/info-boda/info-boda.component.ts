import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { NotificationService } from '../../services/notification/notification.service'; 
import { GestionService } from '../../services/gestion/gestion.service'; // <--- Importamos tu servicio

@Component({
  selector: 'app-info-boda',
  standalone: true,
  imports: [CommonModule, FormsModule], // Quitamos HttpClientModule de aquí, debe ir en el app.config
  templateUrl: './info-boda.component.html',
  styleUrl: './info-boda.component.css'
})
export class InfoBodaComponent implements OnInit {
  editMode: boolean = false;
  cargando: boolean = false;
  guardando: boolean = false;

  bodaInfo: any = {
    lugarNombre: '',
    direccion: '',
    googleMapsLink: '',
    dressCode: '',
    menuResumen: '',
    fechaHora: ''
  };

  constructor(
    public authService: AuthService,
    private notifService: NotificationService, 
    private gestionService: GestionService, // <--- Inyectamos el servicio
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarInformacion();
  }

  cargarInformacion() {
    const codigo = this.authService.getCodigoBoda();
    if (!codigo) return;

    this.cargando = true;
    // Usamos el método del servicio que apunta a /configuracion-boda/:codigo
    this.gestionService.getConfiguracion(codigo).subscribe({
      next: (res: any) => {
        if (res && res.codigoBoda) {
          this.bodaInfo = res;
        }
        this.cargando = false;
      },
      error: (err: any) => {
        this.cargando = false;
        console.error("Error al cargar:", err);
        this.notifService.showError('Error', 'No se encontró la configuración de esta boda.');
      }
    });
  }

  guardarCambios() {
    this.guardando = true;
    const datosParaGuardar = {
      ...this.bodaInfo,
      codigoBoda: this.authService.getCodigoBoda()
    };

    // Usamos el servicio para guardar
    this.gestionService.postConfiguracion(datosParaGuardar).subscribe({
      next: () => {
        this.guardando = false;
        this.editMode = false;
        this.notifService.showSuccess('¡Actualizado!', 'La guía de boda se guardó correctamente.');
      },
      error: (err: any) => {
        this.guardando = false;
        this.notifService.showError('Error al guardar', 'Hubo un problema con el servidor.');
      }
    });
  }

  irAlMenu() {
    this.router.navigate(['/home']);
  }
}