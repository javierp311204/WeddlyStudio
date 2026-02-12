import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth/auth.service';
import { NotificationService } from '../../services/notification/notification.service';
import { GestionService } from '../../services/gestion/gestion.service';

@Component({
  selector: 'app-info-boda',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
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
    private gestionService: GestionService,
    private router: Router,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.cargarInformacion();
  }

  cargarInformacion() {
    const codigo = this.authService.getCodigoBoda();
    if (!codigo) return;

    this.cargando = true;
    this.gestionService.getConfiguracion(codigo).subscribe({
      next: (res: any) => {
        if (res && res.codigoBoda) {
          this.bodaInfo = res;
        }
        this.cargando = false;
      },
      error: (err: any) => {
        this.cargando = false;
        console.error('Error al cargar:', err);
        this.notifService.showError(
          this.translate.instant('COMMON.ERROR'),
          this.translate.instant('INFO.LOAD_ERROR')
        );
      }
    });
  }

  guardarCambios() {
    this.guardando = true;
    const datosParaGuardar = {
      ...this.bodaInfo,
      codigoBoda: this.authService.getCodigoBoda()
    };

    this.gestionService.postConfiguracion(datosParaGuardar).subscribe({
      next: () => {
        this.guardando = false;
        this.editMode = false;
        this.notifService.showSuccess(
          this.translate.instant('INFO.SAVE_SUCCESS_TITLE'),
          this.translate.instant('INFO.SAVE_SUCCESS_DESC')
        );
      },
      error: (err: any) => {
        this.guardando = false;
        this.notifService.showError(
          this.translate.instant('NOTIFICATIONS.ERROR_SAVING'),
          this.translate.instant('INFO.SAVE_ERROR_DESC')
        );
      }
    });
  }

  irAlMenu() {
    this.router.navigate(['/home']);
  }
}