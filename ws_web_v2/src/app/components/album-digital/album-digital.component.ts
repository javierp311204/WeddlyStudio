import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient, HttpHeaders } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth/auth.service';
import { NotificationService } from '../../services/notification/notification.service';
import { Router } from '@angular/router';

// ─────────────────────────────────────────────────────────────
// MIGRACIÓN v2:
//  • codigoBoda          → weddingId (UUID)
//  • GET  /api/album/:codigo           → GET  /api/weddings/:weddingId/photos?page=1&limit=50
//  • POST /api/album/subir             → POST /api/weddings/:weddingId/photos  (multipart, campo 'photo')
//  • foto.url            → foto.url (igual, viene de S3 presigned)
//  • foto.usuario        → foto.uploaded_by.first_name
//  • foto.fecha          → foto.created_at
//
//  NOTA: v2 convierte automáticamente la imagen a WebP + thumbnail.
//  El campo del form ahora se llama 'photo' (antes 'imagen').
// ─────────────────────────────────────────────────────────────

@Component({
  selector: 'app-album-digital',
  standalone: true,
  imports: [CommonModule, HttpClientModule, TranslateModule],
  templateUrl: './album-digital.component.html',
  styleUrl: './album-digital.component.css',
})
export class AlbumDigitalComponent implements OnInit {
  fotos: any[] = [];
  weddingId = '';
  private apiUrl = 'http://localhost:3000/api';

  constructor(
    private http: HttpClient,
    public authService: AuthService,
    private notifService: NotificationService,
    private router: Router,
    private translate: TranslateService
  ) {}

  ngOnInit() {
    // v2: usar weddingId (UUID)
    this.weddingId = localStorage.getItem('weddingId') || '';
    this.cargarFotos();
  }

  private getOptions() {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
    };
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    // v2: campo 'photo' (antes 'imagen')
    formData.append('photo', file);

    // v2: POST /api/weddings/:weddingId/photos
    this.http
      .post(`${this.apiUrl}/weddings/${this.weddingId}/photos`, formData, this.getOptions())
      .subscribe({
        next: (res: any) => {
          this.notifService.showSuccess(
            this.translate.instant('ALBUM.UPLOAD_SUCCESS_TITLE'),
            this.translate.instant('ALBUM.UPLOAD_SUCCESS_DESC'),
          );
          this.cargarFotos();
        },
        error: (err) => {
          console.error('Error al subir foto:', err);
          this.notifService.showError(
            this.translate.instant('COMMON.ERROR'),
            this.translate.instant('ALBUM.UPLOAD_ERROR'),
          );
        }
      });
  }

  cargarFotos() {
    if (!this.weddingId) return;

    // v2: GET /api/weddings/:weddingId/photos → { photos, pagination }
    this.http
      .get<any>(`${this.apiUrl}/weddings/${this.weddingId}/photos?limit=50`, this.getOptions())
      .subscribe({
        next: (res) => {
          // v2 devuelve { success, data: { photos, pagination } }
          this.fotos = res?.data?.photos ?? res?.photos ?? [];
        },
        error: (err) => console.error('Error al cargar fotos:', err),
      });
  }

}