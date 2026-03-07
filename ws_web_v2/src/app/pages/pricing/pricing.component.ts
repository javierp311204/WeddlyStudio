import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { PaymentService } from '../../services/payment/payment.service';
import { NotificationService } from '../../services/notification/notification.service';
import { AuthService } from '../../services/auth/auth.service';
import { HttpClient } from '@angular/common/http';

interface PlanUI {
  id:        string;
  tipo:      string;
  nombre:    string;
  emoji:     string;
  precio:    number;
  periodo:   string;
  subtitulo: string;
  badge:     string;
  features:  string[];
  destacado: boolean;
}

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.css',
})
export class PricingComponent implements OnInit {
  planes: PlanUI[] = [];
  planActual = 'free';
  cargando   = true;
  procesandoPlanId: string | null = null;

  private planMeta: Record<string, Omit<PlanUI, 'id' | 'precio' | 'tipo' | 'features'>> = {
    free: {
      nombre:    'Gratuito',
      emoji:     '🎁',
      periodo:   '',
      subtitulo: 'Para siempre gratis',
      badge:     '',
      destacado: false,
    },
    one_time: {
      nombre:    'Esencial',
      emoji:     '💎',
      periodo:   'pago único',
      subtitulo: 'Sin mensualidades',
      badge:     'Mejor valor',
      destacado: false,
    },
    subscription: {
      nombre:    'Premium',
      emoji:     '👑',
      periodo:   '/mes',
      subtitulo: 'Cancela cuando quieras',
      badge:     'Más popular',
      destacado: true,
    },
  };

  private featuresDefault: Record<string, string[]> = {
    free:         ['1 boda activa', 'Hasta 40 invitados', 'Hasta 20 fotos', 'Funciones básicas'],
    one_time:     ['1 boda lifetime', 'Invitados ilimitados', 'Hasta 80 fotos', 'Exportación PDF', 'Checklist completo', 'Plano de mesas'],
    subscription: ['Bodas ilimitadas', 'Invitados ilimitados', 'Hasta 80 fotos por boda', 'Todas las funciones premium', 'Soporte prioritario'],
  };

  // Mapeo de features_json del backend → textos legibles
  private featureLabels: Record<string, string> = {
    pdf_export:          'Exportación a PDF',
    google_calendar:     'Integración Google Calendar',
    drag_drop_tables:    'Plano de mesas interactivo',
    photo_moderation:    'Moderación de álbum',
    planner_dashboard:   'Panel de wedding planner',
    premium_stationery:  'Papelería premium',
  };

  constructor(
    private paymentService: PaymentService,
    private notifService: NotificationService,
    private authService: AuthService,
    private router: Router,
    private http : HttpClient,
  ) {}

  ngOnInit() {
    this.cargarPlanes();
    this.cargarPlanActual();

    const url = window.location.href;
    if (url.includes('payment/success') || url.includes('session_id')) {
    setTimeout(() => this.cargarPlanActual(), 2000);
    }
  }

  /** Convierte features_json del backend en array de strings legibles */
  private parseFeaturesJson(plan: any, tipo: string): string[] {
    const fj = plan.features_json;
    if (!fj || typeof fj !== 'object') return this.featuresDefault[tipo] ?? [];

    const result: string[] = [];

    // Límites del plan
    if (plan.max_guests > 0)  result.push(`Hasta ${plan.max_guests} invitados`);
    if (plan.max_guests === -1) result.push('Invitados ilimitados');
    if (plan.max_photos > 0)  result.push(`Hasta ${plan.max_photos} fotos`);
    if (plan.max_weddings === -1) result.push('Bodas ilimitadas');
    else if (plan.max_weddings === 1) result.push('1 boda activa');

    // Features booleanas
    Object.entries(fj).forEach(([key, val]) => {
      if (val === true && this.featureLabels[key]) {
        result.push(this.featureLabels[key]);
      } else if (key === 'checklist' && val === 'full') {
        result.push('Checklist completo');
      } else if (key === 'checklist' && val === 'limited') {
        result.push('Checklist básico');
      }
    });

    return result.length > 0 ? result : this.featuresDefault[tipo];
  }

  cargarPlanes() {
    this.paymentService.getPlanes().subscribe({
      next: (response) => {
        const raw: any[] = response?.data ?? [];
        const orden = ['free', 'one_time', 'subscription'];

        this.planes = orden
          .map(tipo => {
            // El backend usa el campo "name" para identificar el tipo de plan
            const backendPlan = raw.find((p: any) => p.name === tipo);
            if (!backendPlan) return null;

            const meta     = this.planMeta[tipo];
            const features = this.parseFeaturesJson(backendPlan, tipo);

            return {
              id:     backendPlan.id,
              tipo,
              precio: Number(backendPlan.price ?? 0),
              features,
              ...meta,
            } as PlanUI;
          })
          .filter(Boolean) as PlanUI[];

        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        this.notifService.showError('Error', 'No se pudieron cargar los planes');
      },
    });
  }

  cargarPlanActual() {
    if (!this.authService.isLoggedIn()) { this.planActual = 'free'; return; }

    const weddingId = this.authService.getWeddingId();
    if (!weddingId) { this.planActual = 'free'; return; }

    // Leer el plan_type directamente de la boda
    this.http.get<any>(`http://localhost:3000/api/weddings/${weddingId}`).subscribe({
      next: (res) => {
        this.planActual = res?.data?.plan_type ?? res?.plan_type ?? 'free';
      },
      error: () => { this.planActual = 'free'; },
    });
  }

  async seleccionarPlan(plan: PlanUI) {
    if (!this.authService.isLoggedIn()) {
      this.notifService.showError('Inicia sesión', 'Debes tener una cuenta para adquirir un plan.');
      this.router.navigate(['/login']);
      return;
    }
    if (plan.tipo === 'free') {
      this.notifService.showError('Plan gratuito', 'Ya tienes acceso al plan gratuito.');
      return;
    }
    if (plan.tipo === this.planActual) {
      this.notifService.showError('Plan actual', 'Este ya es tu plan activo.');
      return;
    }

    this.procesandoPlanId = plan.id;
    const weddingId = this.authService.getWeddingId() || undefined;

    try {
      if (plan.tipo === 'one_time') {
        await this.paymentService.crearPagoUnico(plan.id, weddingId);
      } else {
        await this.paymentService.crearSuscripcion(plan.id, weddingId);
      }
      this.procesandoPlanId = null;
    } catch {
      this.procesandoPlanId = null;
      this.notifService.showError('Error en el pago', 'Hubo un problema al procesar tu pago. Inténtalo de nuevo.');
    }
  }

  esPlanActual(tipo: string): boolean { return this.planActual === tipo; }
  isProcesando(planId: string): boolean { return this.procesandoPlanId === planId; }
}