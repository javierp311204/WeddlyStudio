import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { PaymentService } from '../../services/payment/payment.service';
import { NotificationService } from '../../services/notification/notification.service';
import { AuthService } from '../../services/auth/auth.service';

// ─────────────────────────────────────────────────────────────
// MIGRACIÓN v2:
//  • Usa PaymentService v2 (ya migrado) en lugar de HttpClient directo
//  • planId 'unlimited' → 'subscription'
//  • crearPagoUnico(planId) / crearSuscripcion(planId) — ahora reciben planId
//  • cargarPlanActual: response.plan.type (antes response.plan string)
//  • plan.name / plan.price / plan.features (antes plan.nombre/precio/caracteristicas)
// ─────────────────────────────────────────────────────────────

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.css',
})
export class PricingComponent implements OnInit {
  planes: any[] = [];
  planActual: string = 'free';
  cargando: boolean = true;
  procesandoPago: boolean = false;

  constructor(
    private paymentService: PaymentService,
    private notifService: NotificationService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.cargarPlanes();
    this.cargarPlanActual();
  }

  cargarPlanes() {
    // PaymentService.getPlanes() → GET /api/plans
    this.paymentService.getPlanes().subscribe({
      next: (response) => {
        // v2: response.plans (array) o response.data
        this.planes = response?.data ?? [];
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error cargando planes:', err);
        this.cargando = false;
        this.notifService.showError('Error', 'No se pudieron cargar los planes');
      },
    });
  }

  cargarPlanActual() {
    if (!this.authService.isLoggedIn()) {
      this.planActual = 'free';
      return;
    }
    // PaymentService.getMiPlan() → GET /api/subscriptions/current
    this.paymentService.getMiPlan().subscribe({
      next: (response) => {
        // v2: plan type en response.plan.type
        this.planActual =
          response?.plan?.type ??
          response?.subscription?.plan_type ??
          'free';
      },
      error: () => { this.planActual = 'free'; },
    });
  }

  async seleccionarPlan(planId: string) {
    if (!this.authService.isLoggedIn()) {
      this.notifService.showError('Inicia sesión', 'Debes tener una cuenta para adquirir un plan.');
      this.router.navigate(['/login']);
      return;
    }
    if (planId === 'free') {
      this.notifService.showError('Plan gratuito', 'Ya tienes acceso al plan gratuito.');
      return;
    }
    if (planId === this.planActual) {
      this.notifService.showError('Plan actual', 'Este ya es tu plan activo.');
      return;
    }

    this.procesandoPago = true;
    const weddingId = this.authService.getWeddingId();

    try {
      if (planId === 'one_time') {
        // v2: crearPagoUnico(planId, weddingId?)
        await this.paymentService.crearPagoUnico(planId, weddingId || undefined);
      } else if (planId === 'subscription') {
        // v2: 'subscription' reemplaza a 'unlimited'
        await this.paymentService.crearSuscripcion(planId, weddingId || undefined);
      }
    } catch (error) {
      this.procesandoPago = false;
      this.notifService.showError('Error en el pago', 'Hubo un problema al procesar tu pago. Inténtalo de nuevo.');
      console.error('Error procesando pago:', error);
    }
  }

  irAlHome() {
    this.router.navigate(['/home']);
  }

  getPlanBadge(planId: string): string {
    if (planId === this.planActual)    return 'Tu plan actual';
    if (planId === 'subscription')     return 'Más popular';   // v2
    if (planId === 'one_time')         return 'Mejor valor';
    return '';
  }

  esPlanActual(planId: string): boolean {
    return this.planActual === planId;
  }
}