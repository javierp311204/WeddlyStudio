import { Component, OnInit, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { NotificationService } from '../../services/notification/notification.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { IconComponent } from '../../shared/icons/icon.component';

registerLocaleData(localeEs);

interface InvitadoV2 {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

@Component({
  selector: 'app-diseno-papeleria',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, TranslateModule, IconComponent],
  templateUrl: './diseno-papeleria.component.html',
  styleUrl: './diseno-papeleria.component.css',
})
export class DisenoPapeleriaComponent implements OnInit {
  @ViewChild('invitacionCard', { static: false }) invitacionCard!: ElementRef;

  nombreNovia: string = 'Valery';
  nombreNovio: string = 'Javier';
  fecha: string = '2025-09-20';
  colorFondo: string = '#ffffff';
  colorTexto: string = '#d4a373';
  textoExtra: string = '';
  imagenFondo: string | null = null;
  // v2: plantillas mapeadas al sistema de invitaciones v2
  // 'elegant' | 'modern' | 'rustic' | 'minimalist'
  plantillaActiva: string = 'elegant';  // antes: 'clasica'

  mostrarConfirmacionSalida: boolean = false;
  cambiosRealizados: boolean = false;
  generandoPDF: boolean = false;
  enviandoEmail: boolean = false;

  mostrarSelectorInvitados: boolean = false;
  invitadosConEmail: InvitadoV2[] = [];

  weddingId: string = '';
  private apiUrl = 'http://localhost:3000/api';

  constructor(
    private http: HttpClient,
    private router: Router,
    private notifService: NotificationService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.weddingId = localStorage.getItem('weddingId') || '';

    this.translate.get('DESIGN.MESSAGE_PLACEHOLDER').subscribe({
      next: (text: string) => {
        if (!this.textoExtra) this.textoExtra = text;
        this.cargarConfiguracion();
      },
      error: () => this.cargarConfiguracion()
    });
  }

  private getHeaders() {
    const token = localStorage.getItem('token');
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  registrarCambio(): void {
    this.cambiosRealizados = true;
  }

  onFileSelected(event: any): void {
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

  cambiarPlantilla(tipo: string): void {
    if (this.plantillaActiva !== tipo) {
      this.plantillaActiva = tipo;
      this.registrarCambio();
    }
  }

  // ⚠️ v2: No existe endpoint para guardar configuración de diseño.
  // Workaround: guardamos en localStorage hasta que se implemente.
  guardarConfiguracion(): void {
    const config = {
      weddingId:      this.weddingId,
      nombreNovia:    this.nombreNovia,
      nombreNovio:    this.nombreNovio,
      fecha:          this.fecha,
      colorFondo:     this.colorFondo,
      colorTexto:     this.colorTexto,
      textoExtra:     this.textoExtra,
      plantilla:      this.plantillaActiva,
      imagenFondo:    this.imagenFondo,
    };

    localStorage.setItem(`diseno_${this.weddingId}`, JSON.stringify(config));
    this.cambiosRealizados = false;
    this.notifService.showSuccess(
      this.translate.instant('NOTIFICATIONS.SAVED'),
      this.translate.instant('DESIGN.SAVE_CONFIG')
    );
  }

  // ⚠️ v2: Cargar desde localStorage hasta que haya endpoint dedicado.
  cargarConfiguracion(): void {
    const raw = localStorage.getItem(`diseno_${this.weddingId}`);
    if (raw) {
      try {
        const config = JSON.parse(raw);
        this.nombreNovia    = config.nombreNovia    || this.nombreNovia;
        this.nombreNovio    = config.nombreNovio    || this.nombreNovio;
        this.fecha          = config.fecha          || this.fecha;
        this.colorFondo     = config.colorFondo     || this.colorFondo;
        this.colorTexto     = config.colorTexto     || this.colorTexto;
        if (config.textoExtra)  this.textoExtra   = config.textoExtra;
        this.plantillaActiva = config.plantilla    || this.plantillaActiva;
        this.imagenFondo    = config.imagenFondo   || this.imagenFondo;
      } catch { /* ignorar */ }
    } else {
      // Intentar cargar nombre desde la boda en v2
      if (this.weddingId) {
        this.http.get<any>(`${this.apiUrl}/weddings/${this.weddingId}`, this.getHeaders()).subscribe({
          next: (res) => {
            const w = res?.data ?? res;
            if (w?.name) {
              const partes = w.name.split('&').map((s: string) => s.trim());
              if (partes.length >= 2) {
                this.nombreNovia = partes[0];
                this.nombreNovio = partes[1];
              }
            }
            if (w?.date) this.fecha = w.date.substring(0, 10);
          },
          error: () => {}
        });
      }
    }
  }

  async generarPDF(): Promise<void> {
    if (!this.invitacionCard) return;
    this.generandoPDF = true;

    try {
      const elemento = this.invitacionCard.nativeElement;
      const canvas = await html2canvas(elemento, { scale: 2, useCORS: true, backgroundColor: null, logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgWidth = 150;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const x = (pdf.internal.pageSize.getWidth() - imgWidth) / 2;
      const y = (pdf.internal.pageSize.getHeight() - imgHeight) / 2;
      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      pdf.save(`Invitacion_${this.nombreNovia}_${this.nombreNovio}.pdf`);
      this.notifService.showSuccess(
        this.translate.instant('NOTIFICATIONS.PDF_GENERATED'),
        this.translate.instant('NOTIFICATIONS.PDF_DOWNLOADED')
      );
    } catch (error) {
      this.notifService.showError(this.translate.instant('COMMON.ERROR'), this.translate.instant('NOTIFICATIONS.ERROR_SAVING'));
    } finally {
      this.generandoPDF = false;
    }
  }

  async abrirSelectorInvitados(): Promise<void> {
    if (!this.weddingId) {
      this.notifService.showError(this.translate.instant('COMMON.ERROR'), 'No se encontró el weddingId');
      return;
    }

    // v2: GET /api/weddings/:weddingId/guests
    this.http
      .get<any>(`${this.apiUrl}/weddings/${this.weddingId}/guests`, this.getHeaders())
      .subscribe({
        next: (res) => {
          const lista = res?.data?.guests ?? res?.guests ?? res ?? [];
          // v2: filtrar por email y que sean invitados principales (no companions)
          this.invitadosConEmail = lista.filter(
            (inv: any) => inv.email && inv.email.includes('@') && !inv.companion_of
          );

          if (this.invitadosConEmail.length === 0) {
            this.notifService.showError(
              this.translate.instant('DESIGN.NO_GUESTS_EMAIL'),
              this.translate.instant('DESIGN.NO_GUESTS_EMAIL')
            );
            return;
          }
          this.mostrarSelectorInvitados = true;
        },
        error: (err) => {
          console.error('Error al cargar invitados:', err);
          this.notifService.showError(this.translate.instant('COMMON.ERROR'), 'No se pudieron cargar los invitados');
        }
      });
  }

  cerrarSelectorInvitados(): void {
    this.mostrarSelectorInvitados = false;
    this.invitadosConEmail = [];
  }

  async seleccionarInvitado(invitado: InvitadoV2): Promise<void> {
    this.cerrarSelectorInvitados();
    this.enviandoEmail = true;

    try {
      // 1. Crear invitación (diseño)
      const invRes = await this.http.post<any>(
        `${this.apiUrl}/weddings/${this.weddingId}/invitations`,
        {
          template_type: this.plantillaActiva === 'clasica' ? 'elegant'
                      : this.plantillaActiva === 'moderna' ? 'modern'
                      : this.plantillaActiva,
          primary_color:   this.colorTexto,
          secondary_color: this.colorFondo,
          custom_text:     this.textoExtra,
        },
        this.getHeaders()
      ).toPromise();

      const invitationId = invRes?.data?.id ?? invRes?.id;
      if (!invitationId) throw new Error('No se pudo crear la invitación');

      // 2. Enviar al invitado seleccionado
      await this.http.post<any>(
        `${this.apiUrl}/invitations/${invitationId}/send`,
        { guest_ids: [invitado.id], send_to_all: false },
        this.getHeaders()
      ).toPromise();

      this.notifService.showSuccess(
        'Invitación enviada',
        `Se envió correctamente a ${this.getNombreCompleto(invitado)}`
      );
    } catch (err: any) {
      console.error('Error enviando invitación:', err);
      this.notifService.showError(
        this.translate.instant('COMMON.ERROR'),
        err?.error?.message || 'No se pudo enviar la invitación'
      );
    } finally {
      this.enviandoEmail = false;
    }
  }

  // ⚠️ v2: El endpoint de envío individual no existe en v2.
  // En v2 el flujo es: crear una Invitation → POST /api/invitations/:id/send
  // Aquí se deja el método generando el PDF pero mostrando aviso al usuario.
  async enviarEmail(emailDestino: string, nombreInvitado?: string): Promise<void> {
    this.notifService.showError(
      'Funcionalidad pendiente',
      'En v2 el envío de invitaciones se gestiona desde el módulo de Invitaciones. Descarga el PDF y envíalo manualmente.'
    );
    // Generar PDF como alternativa
    await this.generarPDF();
  }

  // ⚠️ v2: El envío masivo en v2 se hace a través de POST /api/invitations/:id/send
  // que envía a todos los invitados con email automáticamente.
  async enviarInvitacionesMasivas(): Promise<void> {
    this.enviandoEmail = true;

    try {
      // 1. Crear invitación
      const invRes = await this.http.post<any>(
        `${this.apiUrl}/weddings/${this.weddingId}/invitations`,
        {
          template_type: this.plantillaActiva === 'clasica' ? 'elegant'
                      : this.plantillaActiva === 'moderna' ? 'modern'
                      : this.plantillaActiva,
          primary_color:   this.colorTexto,
          secondary_color: this.colorFondo,
          custom_text:     this.textoExtra,
        },
        this.getHeaders()
      ).toPromise();

      const invitationId = invRes?.data?.id ?? invRes?.id;
      if (!invitationId) throw new Error('No se pudo crear la invitación');

      // 2. Enviar a todos
      const sendRes = await this.http.post<any>(
        `${this.apiUrl}/invitations/${invitationId}/send`,
        { send_to_all: true },
        this.getHeaders()
      ).toPromise();

      const result = sendRes?.data ?? sendRes;
      this.notifService.showSuccess(
        'Invitaciones enviadas',
        result?.message || `${result?.sent} invitaciones enviadas correctamente`
      );
    } catch (err: any) {
      console.error('Error en envío masivo:', err);
      this.notifService.showError(
        this.translate.instant('COMMON.ERROR'),
        err?.error?.message || 'No se pudieron enviar las invitaciones'
      );
    } finally {
      this.enviandoEmail = false;
    }
  }

  // Helper para el template
  getNombreCompleto(inv: InvitadoV2): string {
    return `${inv.first_name} ${inv.last_name}`.trim();
  }
}