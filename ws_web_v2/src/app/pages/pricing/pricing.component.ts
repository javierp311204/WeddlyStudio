import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { PaymentService } from '../../services/payment/payment.service';
import { NotificationService } from '../../services/notification/notification.service';
import { AuthService } from '../../services/auth/auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';

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
export class PricingComponent implements OnInit, OnDestroy {
  planes: PlanUI[] = [];
  planActual = 'free';
  cargando   = true;
  procesandoPlanId: string | null = null;

  private rawPlanes: any[] = [];        // guardamos el raw para re-renderizar si cambia idioma
  private langSub!: Subscription;

  private featureLabels: Record<string, string> = {};

  constructor(
    private paymentService: PaymentService,
    private notifService:   NotificationService,
    private authService:    AuthService,
    private router:         Router,
    private http:           HttpClient,
    private translate:      TranslateService,
  ) {}

  ngOnInit() {
    // Renderizar cuando el idioma cambie (cubre reload directo en /pricing)
    this.langSub = this.translate.onLangChange.subscribe(() => {
      if (this.rawPlanes.length > 0) this.buildPlanes();
    });

    // Cargar planes del backend y luego construir UI
    this.cargarPlanesDesdeApi();
    this.cargarPlanActual();

    const url = window.location.href;
    if (url.includes('payment/success') || url.includes('session_id')) {
      setTimeout(() => this.cargarPlanActual(), 2000);
    }
  }

  ngOnDestroy() {
    this.langSub?.unsubscribe();
  }

  // ── Carga raw desde la API y luego construye UI ─────────────

  cargarPlanesDesdeApi() {
    this.cargando = true;
    this.paymentService.getPlanes().subscribe({
      next: (response) => {
        this.rawPlanes = response?.data ?? [];
        this.buildPlanes();
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        this.notifService.showError(
          this.translate.instant('COMMON.ERROR'),
          this.translate.instant('PRICING.ERRORS.LOAD_PLANS'),
        );
      },
    });
  }

  // ── Construye PlanUI[] usando translate.instant() ───────────
  // Se llama desde cargarPlanesDesdeApi() Y desde onLangChange

  private buildPlanes() {
    this.featureLabels = {
      pdf_export:         this.translate.instant('PRICING.FEATURES.PDF_EXPORT')         || 'Exportación a PDF',
      google_calendar:    this.translate.instant('PRICING.FEATURES.GOOGLE_CALENDAR')    || 'Integración Google Calendar',
      drag_drop_tables:   this.translate.instant('PRICING.FEATURES.DRAG_DROP_TABLES')   || 'Plano de mesas interactivo',
      photo_moderation:   this.translate.instant('PRICING.FEATURES.PHOTO_MODERATION')   || 'Moderación de álbum',
      planner_dashboard:  this.translate.instant('PRICING.FEATURES.PLANNER_DASHBOARD')  || 'Panel de wedding planner',
      premium_stationery: this.translate.instant('PRICING.FEATURES.PREMIUM_STATIONERY') || 'Papelería premium',
    };

    const planMeta: Record<string, Omit<PlanUI, 'id' | 'precio' | 'tipo' | 'features'>> = {
      free: {
        nombre:    this.translate.instant('PRICING.PLANS.FREE_NAME')       || 'Gratuito',
        emoji:     '🎁',
        periodo:   '',
        subtitulo: this.translate.instant('PRICING.PLANS.FREE_SUBTITLE')   || 'Para empezar',
        badge:     '',
        destacado: false,
      },
      one_time: {
        nombre:    this.translate.instant('PRICING.PLANS.ESSENTIAL_NAME')      || 'Evento PRO',
        emoji:     '💎',
        periodo:   this.translate.instant('PRICING.ONE_TIME_PAYMENT')          || 'pago único',
        subtitulo: this.translate.instant('PRICING.PLANS.ESSENTIAL_SUBTITLE')  || 'Todo lo que necesitas',
        badge:     this.translate.instant('PRICING.BEST_VALUE')                || 'Mejor valor',
        destacado: false,
      },
      subscription: {
        nombre:    this.translate.instant('PRICING.PLANS.PREMIUM_NAME')      || 'Premium',
        emoji:     '👑',
        periodo:   this.translate.instant('PRICING.PER_MONTH')               || '/mes',
        subtitulo: this.translate.instant('PRICING.PLANS.PREMIUM_SUBTITLE')  || 'Para profesionales',
        badge:     this.translate.instant('PRICING.MOST_POPULAR')            || 'Más popular',
        destacado: true,
      },
    };

    const orden = ['free', 'one_time', 'subscription'];
    this.planes = orden
      .map(tipo => {
        const backendPlan = this.rawPlanes.find((p: any) => p.name === tipo);
        if (!backendPlan) return null;
        return {
          id:     backendPlan.id,
          tipo,
          precio: Number(backendPlan.price ?? 0),
          features: this.parseFeaturesJson(backendPlan, tipo),
          ...planMeta[tipo],
        } as PlanUI;
      })
      .filter(Boolean) as PlanUI[];
  }

  private parseFeaturesJson(plan: any, tipo: string): string[] {
    const fj = plan.features_json;
    const result: string[] = [];

    if (plan.max_weddings === -1) {
      result.push(this.translate.instant('PRICING.FEATURES.UNLIMITED_WEDDINGS') || 'Bodas ilimitadas');
    } else if (plan.max_weddings === 1) {
      result.push(this.translate.instant('PRICING.FEATURES.ONE_WEDDING') || '1 boda activa');
    }

    if (plan.max_guests === -1) {
      result.push(this.translate.instant('PRICING.FEATURES.UNLIMITED_GUESTS') || 'Invitados ilimitados');
    } else if (plan.max_guests > 0) {
      result.push(
        this.translate.instant('PRICING.FEATURES.UP_TO_GUESTS', { count: plan.max_guests })
        || `Hasta ${plan.max_guests} invitados`,
      );
    }

    if (plan.max_photos > 0) {
      result.push(
        this.translate.instant('PRICING.FEATURES.UP_TO_PHOTOS', { count: plan.max_photos })
        || `Hasta ${plan.max_photos} fotos`,
      );
    }

    if (fj && typeof fj === 'object') {
      if (fj['checklist'] === 'full') {
        result.push(this.translate.instant('PRICING.FEATURES.CHECKLIST_FULL') || 'Checklist completo');
      } else if (fj['checklist'] === 'limited') {
        result.push(this.translate.instant('PRICING.FEATURES.CHECKLIST_BASIC') || 'Checklist básico');
      }

      Object.entries(fj).forEach(([key, val]) => {
        if (val === true && this.featureLabels[key]) {
          result.push(this.featureLabels[key]);
        }
      });
    }

    return result;
  }

  // ── Plan actual ─────────────────────────────────────────────

  cargarPlanActual() {
    if (!this.authService.isLoggedIn()) { this.planActual = 'free'; return; }

    const weddingId = this.authService.getWeddingId();
    if (!weddingId) { this.planActual = 'free'; return; }

    const token = localStorage.getItem('token');
    this.http.get<any>(`http://localhost:3000/api/weddings/${weddingId}`, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
    }).subscribe({
      next:  (res) => { this.planActual = res?.data?.plan_type ?? 'free'; },
      error: ()    => { this.planActual = 'free'; },
    });
  }

  // ── Seleccionar plan ────────────────────────────────────────

  async seleccionarPlan(plan: PlanUI) {
    if (!this.authService.isLoggedIn()) {
      this.notifService.showError(
        this.translate.instant('PRICING.ERRORS.LOGIN_REQUIRED'),
        this.translate.instant('PRICING.ERRORS.LOGIN_DESC'),
      );
      this.router.navigate(['/login']);
      return;
    }
    if (plan.tipo === 'free') {
      this.notifService.showError(
        this.translate.instant('PRICING.ERRORS.FREE_PLAN'),
        this.translate.instant('PRICING.ERRORS.FREE_DESC'),
      );
      return;
    }
    if (plan.tipo === this.planActual) {
      this.notifService.showError(
        this.translate.instant('PRICING.ERRORS.CURRENT_PLAN'),
        this.translate.instant('PRICING.ERRORS.CURRENT_DESC'),
      );
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
      this.notifService.showError(
        this.translate.instant('PRICING.ERRORS.PAYMENT_ERROR'),
        this.translate.instant('PRICING.ERRORS.PAYMENT_DESC'),
      );
    }
  }

  esPlanActual(tipo: string): boolean  { return this.planActual === tipo; }
  isProcesando(planId: string): boolean { return this.procesandoPlanId === planId; }
}