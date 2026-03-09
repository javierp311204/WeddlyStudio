import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GestionService } from '../../services/gestion/gestion.service';
import { AuthService } from '../../services/auth/auth.service';
import { TranslateService, TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.css',
})
export class OnboardingComponent implements OnInit {
  paso = 1;
  totalPasos = 6;
  cargando = false;
  error = '';
  prioridades: any[] = [];

  constructor(
    private gestionService: GestionService,
    private authService: AuthService,
    private router: Router,
    private translate: TranslateService,
  ) {}

  // Paso 2a — datos obligatorios
  nombre    = '';   // wedding.name
  fecha     = '';   // wedding.wedding_date
  ciudad    = '';   // wedding.location_name  (nombre del lugar/salón)

  // Paso 2b — datos opcionales (mismos que info-boda)
  direccion = '';   // wedding.address
  dresscode = '';   // wedding.dress_code
  menu      = '';   // wedding.menu_description

  // Paso 3
  estimadoInvitados = 50;

  // Paso 4
  prioridad = 'invitados';

  // Paso 5
  primerInvitadoNombre   = '';
  primerInvitadoApellido = '';
  primerInvitadoEmail    = '';

  weddingId = '';
  fechaMin  = new Date().toISOString().split('T')[0];

  dresscodeOpciones = [
    { value: 'Gala (Etiqueta)',   label: '👔 Gala (Etiqueta)' },
    { value: 'Formal',            label: '🎩 Formal' },
    { value: 'Cóctel',            label: '🥂 Cóctel' },
    { value: 'Informal / Casual', label: '👗 Informal / Casual' },
  ];

  ngOnInit() {
    if (this.authService.getWeddingId()) {
      this.router.navigate(['/dashboard']);
    }

    this.prioridades = [
    { key: 'invitados',    emoji: '👥', label: this.translate.instant('NAV.GUESTS'),   desc: 'Añade y organiza tu lista de invitados' },
    { key: 'mesas',        emoji: '🪑', label: this.translate.instant('NAV.TABLES'),   desc: 'Diseña la distribución de tu evento' },
    { key: 'checklist',    emoji: '✅', label: this.translate.instant('NAV.CHECKLIST'), desc: 'Organiza todas las tareas pendientes' },
    { key: 'album',        emoji: '📸', label: this.translate.instant('NAV.ALBUM'),    desc: 'Sube fotos y recuerdos del evento' },
    { key: 'invitaciones', emoji: '💌', label: 'Invitaciones digitales', desc: 'Diseña y envía invitaciones' },
  ];
  }



  get progreso(): number {
    return Math.round(((this.paso - 1) / (this.totalPasos - 1)) * 100);
  }

  getPrioridadEmoji(): string {
    return this.prioridades.find(p => p.key === this.prioridad)?.emoji ?? '🎯';
  }

  getPrioridadLabel(): string {
    return this.prioridades.find(p => p.key === this.prioridad)?.label ?? 'el módulo';
  }

  siguiente() {
    this.error = '';

    if (this.paso === 2) {
      if (!this.nombre.trim() || !this.fecha || !this.ciudad.trim()) {
        this.error = this.translate.instant('ONBOARDING.ERROR_REQUIRED');
        return;
      }
      this.crearBoda();
      return;
    }

    if (this.paso === 5 && this.prioridad === 'invitados' && this.primerInvitadoNombre.trim()) {
      this.crearPrimerInvitado();
      return;
    }

    this.paso++;
  }

  anterior() {
    if (this.paso > 1) this.paso--;
  }

  crearBoda() {
    this.cargando = true;

    // Campos obligatorios siempre presentes
    const payload: any = {
      name:          this.nombre.trim(),
      wedding_date:  new Date(this.fecha + 'T12:00:00').toISOString(),
      location_name: this.ciudad.trim(),
    };

    // Campos opcionales: solo si el usuario los rellenó
    if (this.direccion.trim())  payload.address          = this.direccion.trim();
    if (this.dresscode)         payload.dress_code       = this.dresscode;
    if (this.menu.trim())       payload.menu_description = this.menu.trim();

    this.gestionService.crearBoda(payload).subscribe({
      next: (res: any) => {
        const boda = res?.data ?? res;
        this.weddingId = boda.id;
        this.authService.setWeddingId(boda.id);
        localStorage.setItem('weddingRole', 'owner');
        this.cargando = false;
        this.paso++;
      },
      error: (err: any) => {
        this.error = err?.error?.message ?? this.translate.instant('ONBOARDING.ERROR_CREATE');
        this.cargando = false;
      },
    });
  }

  crearPrimerInvitado() {
    this.cargando = true;
    this.gestionService.postInvitado(this.weddingId, {
      first_name: this.primerInvitadoNombre,
      last_name:  this.primerInvitadoApellido || undefined,
      email:      this.primerInvitadoEmail    || undefined,
    }).subscribe({
      next:  () => { this.cargando = false; this.paso++; },
      error: () => { this.cargando = false; this.paso++; },
    });
  }

  seleccionarPrioridad(key: string) {
    this.prioridad = key;
  }

  irAlDashboard() {
    this.router.navigate(['/dashboard']);
  }

  irAModulo() {
    const rutas: Record<string, string> = {
      invitados:    '/invitados',
      mesas:        '/plano',
      checklist:    '/checklist',
      album:        '/album',
      invitaciones: '/diseno',
    };
    this.router.navigate([rutas[this.prioridad] ?? '/dashboard']);
  }
}