import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { PaymentService } from '../../services/payment/payment.service';
import { NotificationService } from '../../services/notification/notification.service';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.css'
})
export class PricingComponent implements OnInit {
  planes: any[] = [];
  planActual: string = 'free';
  cargando: boolean = true;
  procesandoPago: boolean = false;

  constructor(
    private paymentService: PaymentService,
    private notifService: NotificationService,
    private router: Router
  ) {}

  ngOnInit() {
    this.cargarPlanes();
    this.cargarPlanActual();
  }

  cargarPlanes() {
    this.paymentService.getPlanes().subscribe({
      next: (response) => {
        this.planes = response.planes;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error cargando planes:', err);
        this.cargando = false;
        this.notifService.showError('Error', 'No se pudieron cargar los planes');
      }
    });
  }

  cargarPlanActual() {
    const token = localStorage.getItem('token');
    if (!token) {
      this.planActual = 'free';
      return;
    }

    this.paymentService.getMiPlan().subscribe({
      next: (response) => {
        this.planActual = response.plan;
      },
      error: (err) => {
        console.error('Error obteniendo plan actual:', err);
      }
    });
  }

  async seleccionarPlan(planId: string) {
    const token = localStorage.getItem('token');
    
    if (!token) {
      this.notifService.showError(
        'Inicia sesión',
        'Debes tener una cuenta para adquirir un plan.'
      );
      this.router.navigate(['/login']);
      return;
    }

    if (planId === 'free') {
      this.notifService.showError(
        'Plan gratuito',
        'Ya tienes acceso al plan gratuito.'
      );
      return;
    }

    if (planId === this.planActual) {
      this.notifService.showError(
        'Plan actual',
        'Este ya es tu plan activo.'
      );
      return;
    }

    this.procesandoPago = true;

    try {
      if (planId === 'one_time') {
        await this.paymentService.crearPagoUnico();
      } else if (planId === 'unlimited') {
        await this.paymentService.crearSuscripcion();
      }
    } catch (error) {
      this.procesandoPago = false;
      this.notifService.showError(
        'Error en el pago',
        'Hubo un problema al procesar tu pago. Inténtalo de nuevo.'
      );
      console.error('Error procesando pago:', error);
    }
  }

  irAlHome() {
    this.router.navigate(['/home']);
  }

  getPlanBadge(planId: string): string {
    if (planId === this.planActual) return 'Tu plan actual';
    if (planId === 'unlimited') return 'Más popular';
    if (planId === 'one_time') return 'Mejor valor';
    return '';
  }

  esPlanActual(planId: string): boolean {
    return this.planActual === planId;
  }
}