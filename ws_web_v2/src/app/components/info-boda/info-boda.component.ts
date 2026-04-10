import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth/auth.service';
import { NotificationService } from '../../services/notification/notification.service';

import { IconComponent } from '../../shared/icons/icon.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-info-boda',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, IconComponent],
  templateUrl: './info-boda.component.html',
  styleUrl: './info-boda.component.css'
})
export class InfoBodaComponent implements OnInit {
  editMode  = false;
  cargando  = false;
  guardando = false;
  weddingId = '';

  // Todos los campos en un solo objeto, con nombres consistentes con el template y el schema
  bodaInfo: any = {
    name:          '',   // wedding.name
    venue_name:    '',   // wedding.location_name
    venue_address: '',   // wedding.address
    date:          '',   // wedding.wedding_date (ISO string, cortado a datetime-local)
    dress_code:    '',   // wedding.dress_code
    notes:         '',   // wedding.menu_description
  };

  private apiUrl = environment.apiUrl;

  constructor(
    public authService: AuthService,
    private notifService: NotificationService,
    private translate: TranslateService,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.weddingId = localStorage.getItem('weddingId') || '';
    this.cargarInformacion();
  }

  cargarInformacion() {
    if (!this.weddingId) return;
    this.cargando = true;

    this.http.get<any>(`${this.apiUrl}/weddings/${this.weddingId}`).subscribe({
      next: (res) => {
        const w = res?.data ?? res;
        this.bodaInfo = {
          name:          w.name             || '',
          venue_name:    w.location_name    || '',
          venue_address: w.address          || '',
          date:          w.wedding_date     ? new Date(w.wedding_date).toISOString().substring(0, 16) : '',
          dress_code:    w.dress_code       || '',
          notes:         w.menu_description || '',
        };
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        this.notifService.showError(
          this.translate.instant('COMMON.ERROR'),
          this.translate.instant('INFO.LOAD_ERROR')
        );
      }
    });
  }

  guardarCambios() {
    this.guardando = true;

    // Mapeamos de vuelta a los nombres reales del schema
    const payload: any = {
      name:             this.bodaInfo.name          || undefined,
      wedding_date:     this.bodaInfo.date          ? new Date(this.bodaInfo.date).toISOString() : undefined,
      location_name:    this.bodaInfo.venue_name    || undefined,
      address:          this.bodaInfo.venue_address || undefined,
      dress_code:       this.bodaInfo.dress_code    || undefined,
      menu_description: this.bodaInfo.notes         || undefined,
    };

    // Eliminar claves undefined antes de enviar
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

    this.http.patch(`${this.apiUrl}/weddings/${this.weddingId}`, payload).subscribe({
      next: () => {
        this.guardando = false;
        this.editMode  = false;
        this.notifService.showSuccess(
          this.translate.instant('INFO.SAVE_SUCCESS_TITLE'),
          this.translate.instant('INFO.SAVE_SUCCESS_DESC')
        );
      },
      error: () => {
        this.guardando = false;
        this.notifService.showError(
          this.translate.instant('NOTIFICATIONS.ERROR_SAVING'),
          this.translate.instant('INFO.SAVE_ERROR_DESC')
        );
      }
    });
  }
}