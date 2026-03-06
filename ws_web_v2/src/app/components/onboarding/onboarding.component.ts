import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GestionService } from '../../services/gestion/gestion.service';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.css',
})
export class OnboardingComponent implements OnInit {
  paso = 1;
  totalPasos = 6;
  cargando = false;
  error = '';

  // Paso 2
  nombre = '';
  fecha = '';
  ciudad = '';

  // Paso 3
  estimadoInvitados = 50;

  // Paso 4
  prioridad: string = 'invitados';

  // Paso 5
  primerInvitadoNombre = '';
  primerInvitadoApellido = '';
  primerInvitadoEmail = '';

  weddingId = '';
  fechaMin = new Date().toISOString().split('T')[0];

  prioridades = [
    { key: 'invitados',    emoji: '👥', label: 'Gestión de invitados',   desc: 'Añade y organiza tu lista de invitados' },
    { key: 'mesas',        emoji: '🪑', label: 'Plano de mesas',         desc: 'Diseña la distribución de tu evento' },
    { key: 'checklist',    emoji: '✅', label: 'Checklist de tareas',    desc: 'Organiza todas las tareas pendientes' },
    { key: 'album',        emoji: '📸', label: 'Álbum digital',          desc: 'Sube fotos y recuerdos del evento' },
    { key: 'invitaciones', emoji: '💌', label: 'Invitaciones digitales', desc: 'Diseña y envía invitaciones' },
  ];

  constructor(
    private gestionService: GestionService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit() {
    if (this.authService.getWeddingId()) {
      this.router.navigate(['/home']);
    }
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
        this.error = 'Por favor completa todos los campos obligatorios.';
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
    this.gestionService.crearBoda({
      name: this.nombre,
      wedding_date: new Date(this.fecha + 'T12:00:00').toISOString(),
      location_name: this.ciudad,
    }).subscribe({
      next: (res: any) => {
        const boda = res?.data ?? res;
        this.weddingId = boda.id;
        this.authService.setWeddingId(boda.id);
        localStorage.setItem('weddingRole', 'bride');
        this.cargando = false;
        this.paso++;
      },
      error: (err: any) => {
        this.error = err?.error?.message ?? 'Error al crear la boda. Inténtalo de nuevo.';
        this.cargando = false;
      },
    });
  }

  crearPrimerInvitado() {
    this.cargando = true;
    this.gestionService.postInvitado(this.weddingId, {
      first_name: this.primerInvitadoNombre,
      last_name: this.primerInvitadoApellido || undefined,
      email: this.primerInvitadoEmail || undefined,
    }).subscribe({
      next: () => { this.cargando = false; this.paso++; },
      error: () => { this.cargando = false; this.paso++; }, // avanza aunque falle
    });
  }

  seleccionarPrioridad(key: string) {
    this.prioridad = key;
  }

  irAlDashboard() {
    this.router.navigate(['/home']);
  }

  irAModulo() {
    const rutas: Record<string, string> = {
      invitados:    '/invitados',
      mesas:        '/plano',
      checklist:    '/checklist',
      album:        '/album',
      invitaciones: '/diseno',
    };
    this.router.navigate([rutas[this.prioridad] ?? '/home']);
  }
}