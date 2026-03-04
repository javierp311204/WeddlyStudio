import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth/auth.service';
import { NotificationService } from '../../services/notification/notification.service';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';

// ─────────────────────────────────────────────────────────────
// MIGRACIÓN v2:
//  • GestionService.getConfiguracion()  → GET  /api/weddings/:weddingId
//  • GestionService.postConfiguracion() → PATCH /api/weddings/:weddingId
//  • codigoBoda → weddingId (UUID)
//  • Campos:
//      bodaInfo.lugarNombre → wedding.venue_name
//      bodaInfo.direccion   → wedding.venue_address
//      bodaInfo.fechaHora   → wedding.date  (ISO string)
//      bodaInfo.dressCode   → wedding.dress_code  (campo custom si existe)
//      bodaInfo.menuResumen → wedding.notes  (o campo custom)
//
//  NOTA: Si GestionService aún no tiene los métodos v2, esta implementación
//  llama directamente al HttpClient como referencia. Adapta al servicio.
// ─────────────────────────────────────────────────────────────

@Component({
  selector: 'app-info-boda',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, HttpClientModule],
  templateUrl: './info-boda.component.html',
  styleUrl: './info-boda.component.css'
})
export class InfoBodaComponent implements OnInit {
  editMode: boolean = false;
  cargando: boolean = false;
  guardando: boolean = false;
  weddingId: string = '';

  // v2: mapeados a los campos del schema Wedding de v2
  bodaInfo: any = {
    name: '',               // wedding.name
    venue_name: '',         // campo custom / notes
    venue_address: '',      // campo custom
    date: '',               // wedding.date (ISO)
    dress_code: '',         // campo custom
    menu_summary: '',       // campo custom / notes
  };

  private apiUrl = 'http://localhost:3000/api';

  constructor(
    public authService: AuthService,
    private notifService: NotificationService,
    private router: Router,
    private translate: TranslateService,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.weddingId = localStorage.getItem('weddingId') || '';
    this.cargarInformacion();
  }

  private getHeaders() {
    const token = localStorage.getItem('token');
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  cargarInformacion() {
    if (!this.weddingId) return;
    this.cargando = true;

    // v2: GET /api/weddings/:weddingId
    this.http.get<any>(`${this.apiUrl}/weddings/${this.weddingId}`, this.getHeaders()).subscribe({
      next: (res: any) => {
        const w = res?.data ?? res;
        // Mapear campos v2 → modelo local
        this.bodaInfo = {
          name:          w.name        || '',
          venue_name:    w.venue_name  || '',
          venue_address: w.venue_address || '',
          date:          w.date        ? w.date.substring(0, 16) : '', // datetime-local
          dress_code:    w.dress_code  || '',
          menu_summary:  w.menu_summary || w.notes || '',
        };
        this.cargando = false;
      },
      error: (err: any) => {
        this.cargando = false;
        console.error('Error al cargar boda:', err);
        this.notifService.showError(
          this.translate.instant('COMMON.ERROR'),
          this.translate.instant('INFO.LOAD_ERROR')
        );
      }
    });
  }

  guardarCambios() {
    this.guardando = true;

    // v2: PATCH /api/weddings/:weddingId
    // Solo enviar campos que acepta el schema Wedding de v2
    const payload: any = {
      name:          this.bodaInfo.name,
      date:          this.bodaInfo.date || undefined,
      venue_name:    this.bodaInfo.venue_name  || undefined,
      venue_address: this.bodaInfo.venue_address || undefined,
      dress_code:    this.bodaInfo.dress_code  || undefined,
      notes:         this.bodaInfo.menu_summary || undefined,
    };

    // Limpiar undefined para no mandar campos vacíos
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

    this.http.patch(`${this.apiUrl}/weddings/${this.weddingId}`, payload, this.getHeaders()).subscribe({
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
        console.error('Error al guardar:', err);
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