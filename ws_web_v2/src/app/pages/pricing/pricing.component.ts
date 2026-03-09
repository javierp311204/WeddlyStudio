import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
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
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.css',
})
export class PricingComponent implements OnInit {
  planes: PlanUI[] = [];
  planActual = 'free';
  cargando   = true;
  procesandoPlanId: string | null = null;

  private planMeta!: Record<string, Omit<PlanUI, 'id' | 'precio' | 'tipo' | 'features'>>;

  private featuresDefault!: Record<string, string[]>;
  private featureLabels!: Record<string, string>;

  constructor(
    private paymentService: PaymentService,
    private notifService: NotificationService,
    private authService: AuthService,
    private router: Router,
    private http : HttpClient,
    private translate: TranslateService,
  ) {}

  ngOnInit() {
    this.initializePlanMeta();
    this.cargarPlanes();
    this.cargarPlanActual();

    const url = window.location.href;
    if (url.includes('payment/success') || url.includes('session_id')) {
    setTimeout(() => this.cargarPlanActual(), 2000);
    }
  }

  private initializePlanMeta() {
    this.planMeta = {
      free: {
        nombre:    this.translate.instant('PRICING.PLANS.FREE_NAME'),
        emoji:     '🎁',
        periodo:   '',
        subtitulo: this.translate.instant('PRICING.PLANS.FREE_SUBTITLE'),
        badge:     '',
        destacado: false,
      },
      one_time: {
        nombre:    this.translate.instant('PRICING.PLANS.ESSENTIAL_NAME'),
        emoji:     '💎',
        periodo:   this.translate.instant('PRICING.ONE_TIME_PAYMENT'),
        subtitulo: this.translate.instant('PRICING.PLANS.ESSENTIAL_SUBTITLE'),
        badge:     this.translate.instant('PRICING.BEST_VALUE'),
        destacado: false,
      },
      subscription: {
        nombre:    this.translate.instant('PRICING.PLANS.PREMIUM_NAME'),
        emoji:     '👑',
        periodo:   this.translate.instant('PRICING.PER_MONTH'),
        subtitulo: this.translate.instant('PRICING.PLANS.PREMIUM_SUBTITLE'),
        badge:     this.translate.instant('PRICING.MOST_POPULAR'),
        destacado: true,
      },
    };

    this.featuresDefault = {
      free:         [this.translate.instant('PRICING.FEATURES.ONE_WEDDING'), 'Hasta 40 invitados', 'Hasta 20 fotos', this.translate.instant('PRICING.FEATURES.BASIC_FEATURES')],
      one_time:     [this.translate.instant('PRICING.FEATURES.ONE_LIFETIME'), this.translate.instant('PRICING.FEATURES.UNLIMITED_GUESTS'), 'Hasta 80 fotos', 'Exportación PDF', 'Checklist completo', 'Plano de mesas'],
      subscription: [this.translate.instant('PRICING.FEATURES.UNLIMITED_WEDDINGS'), this.translate.instant('PRICING.FEATURES.UNLIMITED_GUESTS'), 'Hasta 80 fotos por boda', this.translate.instant('PRICING.FEATURES.ALL_PREMIUM'), this.translate.instant('PRICING.FEATURES.PRIORITY_SUPPORT')],
    };

    this.featureLabels = {
      pdf_export:          'Exportación a PDF',
      google_calendar:     'Integración Google Calendar',
      drag_drop_tables:    'Plano de mesas interactivo',
      photo_moderation:    'Moderación de álbum',
      planner_dashboard:   'Panel de wedding planner',
      premium_stationery:  'Papelería premium',
    };
  }

  /** Convierte features_json del backend en array de strings legibles */
  private parseFeaturesJson(plan: any, tipo: string): string[] {
    const fj = plan.features_json;
    if (!fj || typeof fj !== 'object') return this.featuresDefault[tipo] ?? [];

    const result: string[] = [];

    // Límites del plan
    if (plan.max_guests > 0)  result.push(this.translate.instant('PRICING.FEATURES.UP_TO_GUESTS', { count: plan.max_guests }));
    if (plan.max_guests === -1) result.push(this.translate.instant('PRICING.FEATURES.UNLIMITED_GUESTS'));
    if (plan.max_photos > 0)  result.push(this.translate.instant('PRICING.FEATURES.UP_TO_PHOTOS', { count: plan.max_photos }));
    if (plan.max_weddings === -1) result.push(this.translate.instant('PRICING.FEATURES.UNLIMITED_WEDDINGS'));
    else if (plan.max_weddings === 1) result.push(this.translate.instant('PRICING.FEATURES.ONE_WEDDING'));

    // Features booleanas
    Object.entries(fj).forEach(([key, val]) => {
      if (val === true && this.featureLabels[key]) {
        result.push(this.featureLabels[key]);
      } else if (key === 'checklist' && val === 'full') {
        result.push(this.translate.instant('PRICING.FEATURES.CHECKLIST_FULL'));
      } else if (key === 'checklist' && val === 'limited') {
        result.push(this.translate.instant('PRICING.FEATURES.CHECKLIST_BASIC'));
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
        this.notifService.showError(this.translate.instant('COMMON.ERROR'), this.translate.instant('PRICING.ERRORS.LOAD_PLANS'));
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
      this.notifService.showError(this.translate.instant('PRICING.ERRORS.LOGIN_REQUIRED'), this.translate.instant('PRICING.ERRORS.LOGIN_DESC'));
      this.router.navigate(['/login']);
      return;
    }
    if (plan.tipo === 'free') {
      this.notifService.showError(this.translate.instant('PRICING.ERRORS.FREE_PLAN'), this.translate.instant('PRICING.ERRORS.FREE_DESC'));
      return;
    }
    if (plan.tipo === this.planActual) {
      this.notifService.showError(this.translate.instant('PRICING.ERRORS.CURRENT_PLAN'), this.translate.instant('PRICING.ERRORS.CURRENT_DESC'));
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
      this.notifService.showError(this.translate.instant('PRICING.ERRORS.PAYMENT_ERROR'), this.translate.instant('PRICING.ERRORS.PAYMENT_DESC'));
    }
  }

  esPlanActual(tipo: string): boolean { return this.planActual === tipo; }
  isProcesando(planId: string): boolean { return this.procesandoPlanId === planId; }
}