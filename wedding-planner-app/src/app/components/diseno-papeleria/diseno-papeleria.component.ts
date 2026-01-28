import { Component, OnInit } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import localeEs from '@angular/common/locales/es';
import { NotificationService } from '../../services/notification/notification.service';

registerLocaleData(localeEs);

@Component({
  selector: 'app-diseno-papeleria',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './diseno-papeleria.component.html',
  styleUrl: './diseno-papeleria.component.css',
})
export class DisenoPapeleriaComponent implements OnInit {
  // --- Datos de la Invitación ---
  nombreNovia: string = 'Valery';
  nombreNovio: string = 'Javier';
  fecha: string = '2025-09-20';
  colorFondo: string = '#ffffff';
  colorTexto: string = '#d4a373';
  textoExtra: string = '¡Tu presencia es nuestro mejor regalo!';
  imagenFondo: string | null = null;
  plantillaActiva: string = 'clasica';

  // --- Estado de la Interfaz ---
  mostrarConfirmacionSalida: boolean = false;
  cambiosRealizados: boolean = false;
  private API_URL = 'http://localhost:3000/api/gestion';

  constructor(
    private http: HttpClient,
    private router: Router,
    private notifService: NotificationService
  ) {}

  ngOnInit(): void {
    this.cargarConfiguracion();
  }

  // Detecta cualquier cambio en los inputs
  registrarCambio() {
    this.cambiosRealizados = true;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagenFondo = e.target.result;
        this.registrarCambio();
      };
      reader.readAsDataURL(file);
    }
  }

  cambiarPlantilla(tipo: string) {
    if (this.plantillaActiva !== tipo) {
      this.plantillaActiva = tipo;
      this.registrarCambio();
    }
  }

  // --- Navegación ---
  irAlMenu() {
    if (this.cambiosRealizados) {
      this.mostrarConfirmacionSalida = true;
    } else {
      this.notifService.askConfirmation(
        'Confirmar salida',
        'Tienes cambios sin guardar. ¿Estás seguro de que quieres salir sin guardar?',
        'salida_sin_guardar'
      ).then((confirmed) => {
        if (confirmed) {
          this.confirmarSalida();
        }
      });
    }
  }

  confirmarSalida() {
    this.router.navigate(['/dashboard']); 
  }

  // --- Persistencia ---
  guardarConfiguracion() {
    const datos = {
      codigoBoda: localStorage.getItem('codigoBoda'),
      nombreNovia: this.nombreNovia,
      nombreNovio: this.nombreNovio,
      fecha: this.fecha,
      colorFondo: this.colorFondo,
      colorTexto: this.colorTexto,
      textoExtra: this.textoExtra,
      plantilla: this.plantillaActiva,
      imagenFondo: this.imagenFondo,
    };

    this.http.post(`${this.API_URL}/configuracion-boda`, datos).subscribe({
      next: () => {
        this.cambiosRealizados = false;
        this.notifService.showSuccess(
          '¡Guardado!',
          'Configuración de papelería guardada correctamente.'
        );
      },
      error: () => this.notifService.showError(
        'Error',
        'Hubo un problema al guardar la configuración.'
      ),
    });
  }

  cargarConfiguracion() {
    const codigo = localStorage.getItem('codigoBoda');
    if (codigo) {
      this.http
        .get<any>(`${this.API_URL}/configuracion-boda/${codigo}`)
        .subscribe((res) => {
          if (res) Object.assign(this, res);
        });
    }
  }
}
