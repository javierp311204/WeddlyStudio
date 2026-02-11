import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { PaymentService } from '../../services/payment/payment.service';

@Component({
  selector: 'app-plan-limits-widget',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './plan-limits-widget.component.html',
  styleUrl: './plan-limits-widget.component.css'
})
export class PlanLimitsWidgetComponent implements OnInit {
  planActual: string = 'free';
  limites: any = {
    maxBodas: 1,
    maxInvitados: 50,
    featuresActivas: ['basicas']
  };
  uso: any = {
    bodasActivas: 0,
    puedeCrearMasBodas: true
  };
  mostrarWidget: boolean = false;
  cargando: boolean = true;
  Infinity = Infinity; // Para usar en template

  constructor(
    private paymentService: PaymentService,
    private router: Router
  ) {}

  ngOnInit() {
    // Solo cargar si hay token (usuario autenticado)
    const token = localStorage.getItem('token');
    if (token) {
      this.cargarLimites();
    } else {
      this.cargando = false;
      this.mostrarWidget = false;
    }
  }

  cargarLimites() {
    this.paymentService.verificarLimites().subscribe({
      next: (response) => {
        this.planActual = response.plan;
        this.limites = response.limites;
        this.uso = response.uso;
        this.cargando = false;

        // Mostrar widget solo si:
        // 1. Plan free, O
        // 2. Está cerca del límite (>= 80%), O
        // 3. Ya alcanzó el límite
        const porcentajeUso = this.getPorcentajeBodas();
        this.mostrarWidget = this.planActual === 'free' || 
                             porcentajeUso >= 80 || 
                             !this.uso.puedeCrearMasBodas;
      },
      error: (err) => {
        console.error('Error cargando límites:', err);
        this.cargando = false;
        this.mostrarWidget = false;
      }
    });
  }

  getPorcentajeBodas(): number {
    if (this.limites.maxBodas === Infinity) return 0;
    return Math.min((this.uso.bodasActivas / this.limites.maxBodas) * 100, 100);
  }

  irAPricing() {
    this.router.navigate(['/pricing']);
  }

  cerrarWidget() {
    this.mostrarWidget = false;
    // Guardar en localStorage que cerró el widget
    localStorage.setItem('widgetCerrado', 'true');
  }

  getPlanNombre(): string {
    const nombres: { [key: string]: string } = {
      'free': 'Free',
      'one_time': 'One-Time',
      'unlimited': 'Unlimited'
    };
    return nombres[this.planActual] || 'Free';
  }

  getPlanColor(): string {
    const colores: { [key: string]: string } = {
      'free': '#6c757d',
      'one_time': '#d4a373',
      'unlimited': '#606c38'
    };
    return colores[this.planActual] || '#6c757d';
  }
}