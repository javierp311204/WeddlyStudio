import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth/auth.service';
import { NotificationService } from '../../services/notification/notification.service';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/icons/icon.component';
import { environment } from '../../../environments/environment';

export type PhotoStatus = 'pending' | 'approved' | 'rejected' | 'deleted';

export interface Photo {
  id: string;
  url: string;
  thumbnail_url?: string;
  caption?: string;
  status: PhotoStatus;
  file_size?: number;
  created_at: string;
  uploader?: { id: string; first_name: string; last_name: string };
}

export interface PhotoStats {
  total: number;
  limit: number | null;
  remaining: number | null;
  usage_percent: number;
  plan: string;
  by_status: { pending: number; approved: number; rejected: number; deleted: number };
}

@Component({
  selector: 'app-album-digital',
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule, IconComponent],
  templateUrl: './album-digital.component.html',
  styleUrl:    './album-digital.component.css',
})
export class AlbumDigitalComponent implements OnInit {

  // ─── Estado ───────────────────────────────────────────────────
  fotos:        Photo[]     = [];
  stats:        PhotoStats | null = null;
  weddingId     = '';
  isOwner       = false;
  loading       = false;
  uploading     = false;

  // Moderación
  activeFilter: PhotoStatus | 'all' = 'approved';
  moderating:   Record<string, boolean> = {};

  // Paginación
  currentPage  = 1;
  totalPages   = 1;
  totalPhotos  = 0;

  private apiUrl = environment.apiUrl;

  constructor(
    private http:          HttpClient,
    public  authService:   AuthService,
    private notifService:  NotificationService,
    private translate:     TranslateService,
  ) {}

  ngOnInit() {
    this.weddingId = localStorage.getItem('weddingId') || '';
    this.cargarStats();
    this.cargarFotos();
  }

  // ─── Cargar stats ─────────────────────────────────────────────
  cargarStats() {
    if (!this.weddingId) return;
    this.http
      .get<any>(`${this.apiUrl}/weddings/${this.weddingId}/photos/stats`)
      .subscribe({ next: res => (this.stats = res?.data ?? null) });
  }

  // ─── Cargar fotos ─────────────────────────────────────────────
  cargarFotos(page = 1) {
    if (!this.weddingId) return;
    this.loading = true;

    const status = this.activeFilter === 'all' ? '' : `&status=${this.activeFilter}`;
    const url    = `${this.apiUrl}/weddings/${this.weddingId}/photos?page=${page}&limit=20${status}`;

    this.http.get<any>(url).subscribe({
      next: res => {
        const data       = res?.data ?? res;
        this.fotos       = data?.photos ?? [];
        this.isOwner     = data?.is_owner ?? false;
        this.currentPage = data?.pagination?.page ?? 1;
        this.totalPages  = data?.pagination?.total_pages ?? 1;
        this.totalPhotos = data?.pagination?.total ?? 0;
        this.loading     = false;
      },
      error: () => { this.loading = false; },
    });
  }

  // ─── Cambiar filtro ───────────────────────────────────────────
  setFilter(filter: PhotoStatus | 'all') {
    this.activeFilter = filter;
    this.cargarFotos(1);
  }

  // ─── Subir foto ───────────────────────────────────────────────
  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;

    // Validar límite antes de subir
    if (this.stats?.remaining !== null && this.stats?.remaining !== undefined && this.stats.remaining <= 0) {
      this.notifService.showError(
        'Límite alcanzado',
        `Has alcanzado el máximo de fotos para el plan ${this.stats.plan}. Actualiza tu plan para subir más.`,
      );
      return;
    }

    this.uploading = true;
    const formData = new FormData();
    formData.append('photo', file);

    this.http
      .post<any>(`${this.apiUrl}/weddings/${this.weddingId}/photos`, formData)
      .subscribe({
        next: () => {
          this.uploading = false;
          this.notifService.showSuccess('¡Foto subida!', 'Está pendiente de aprobación por el organizador.');
          this.cargarStats();
          // Si es owner, recargar con filtro actual; si no, no cambia nada visible
          if (this.isOwner) this.cargarFotos(1);
        },
        error: err => {
          this.uploading = false;
          const msg = err?.error?.message ?? 'Error al subir la foto';
          this.notifService.showError('Error', msg);
        },
      });
  }

  // ─── Moderar foto (solo owner) ────────────────────────────────
  moderate(foto: Photo, status: PhotoStatus) {
    this.moderating[foto.id] = true;

    this.http
      .patch<any>(`${this.apiUrl}/photos/${foto.id}/moderate`, { status })
      .subscribe({
        next: () => {
          this.moderating[foto.id] = false;
          foto.status = status;
          this.notifService.showSuccess('Moderación', `Foto marcada como ${status}`);
          this.cargarStats();
          this.cargarFotos(this.currentPage);
        },
        error: err => {
          this.moderating[foto.id] = false;
          this.notifService.showError('Error', err?.error?.message ?? 'Error al moderar');
        },
      });
  }

  // ─── Helpers template ─────────────────────────────────────────
  getStatusLabel(status: PhotoStatus): string {
    const map: Record<PhotoStatus, string> = {
      pending:  this.translate.instant('ALBUM.STATUS_PENDING'),
      approved: this.translate.instant('ALBUM.STATUS_APPROVED'),
      rejected: this.translate.instant('ALBUM.STATUS_REJECTED'),
      deleted:  this.translate.instant('ALBUM.STATUS_DELETED'),
    };
    return map[status] ?? status;
  }

  getStatusClass(status: PhotoStatus): string {
    const map: Record<PhotoStatus, string> = {
      pending:  'badge-pending',
      approved: 'badge-approved',
      rejected: 'badge-rejected',
      deleted:  'badge-deleted',
    };
    return map[status] ?? '';
  }

  getLimitLabel(): string {
    if (!this.stats) return '';
    if (this.stats.limit === null) return 'Ilimitadas (Premium)';
    return `${this.stats.total} / ${this.stats.limit} fotos`;
  }

  getUsageColor(): string {
    const pct = this.stats?.usage_percent ?? 0;
    if (pct >= 90) return '#e63946';
    if (pct >= 70) return '#f4a261';
    return '#d4a373';
  }

  changePage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.cargarFotos(page);
  }
}