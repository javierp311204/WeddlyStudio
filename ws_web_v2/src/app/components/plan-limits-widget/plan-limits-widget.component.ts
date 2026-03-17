import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

// ─────────────────────────────────────────────────────────────
// FIXES aplicados:
//  • HttpClientModule eliminado — ya lo provee provideHttpClient() en app.config.ts
//  • Header Authorization eliminado — lo añade authInterceptor automáticamente
//  • planActual → planType (consistencia con el template)
//  • Añadidos limites, uso y getPorcentajeBodas() que el HTML requería
//  • widgetCerrado persiste entre recargas
// ─────────────────────────────────────────────────────────────

interface Limites {
  maxBodas: number;   // Infinity si ilimitado
}

interface Uso {
  bodasActivas:      number;
  puedeCrearMasBodas: boolean;
}

// Límites por plan — ajustar si el backend los devuelve en el futuro
const LIMITES_POR_PLAN: Record<string, Limites> = {
  free:         { maxBodas: 1 },
  one_time:     { maxBodas: 3 },
  subscription: { maxBodas: Infinity },
};

@Component({
  selector: 'app-plan-limits-widget',
  standalone: true,
  imports: [CommonModule, RouterModule],   // HttpClientModule eliminado
  templateUrl: './plan-limits-widget.component.html',
  styleUrl: './plan-limits-widget.component.css',
})
export class PlanLimitsWidgetComponent implements OnInit {
  planType: string  = 'free';
  isFree: boolean   = true;
  mostrarWidget: boolean = false;
  cargando: boolean = true;
  Infinity = Infinity;

  limites: Limites = { maxBodas: 1 };
  uso: Uso         = { bodasActivas: 0, puedeCrearMasBodas: true };

  private apiUrl = 'https://weddly-api-production.up.railway.app/api';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    // No mostrar si el usuario cerró el widget esta sesión
    if (localStorage.getItem('widgetCerrado') === 'true') {
      this.cargando = false;
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      this.cargando = false;
      return;
    }

    this.cargarPlan();
  }

  cargarPlan() {
    // El authInterceptor añade el Bearer token automáticamente
    this.http.get<any>(`${this.apiUrl}/subscriptions/current`).subscribe({
      next: (res) => {
        const data      = res?.data ?? res;
        this.planType   = data?.plan?.plan_type ?? data?.plan?.type ?? 'free';
        this.isFree     = data?.is_free ?? (this.planType === 'free');
        this.limites    = LIMITES_POR_PLAN[this.planType] ?? { maxBodas: 1 };

        // Obtener número de bodas activas
        this.http.get<any>(`${this.apiUrl}/weddings`).subscribe({
          next: (bodas) => {
            const lista = bodas?.data ?? bodas?.weddings ?? [];
            this.uso = {
              bodasActivas:      lista.length,
              puedeCrearMasBodas: lista.length < this.limites.maxBodas,
            };
            this.cargando     = false;
            // Mostrar widget solo en plan free o cuando está cerca del límite
            this.mostrarWidget = this.isFree || !this.uso.puedeCrearMasBodas;
          },
          error: () => {
            this.cargando     = false;
            this.mostrarWidget = this.isFree;
          },
        });
      },
      error: () => {
        this.cargando     = false;
        this.mostrarWidget = false;
      },
    });
  }

  getPorcentajeBodas(): number {
    if (this.limites.maxBodas === Infinity) return 0;
    return Math.min(100, Math.round((this.uso.bodasActivas / this.limites.maxBodas) * 100));
  }

  irAPricing() {
    this.router.navigate(['/pricing']);
  }

  cerrarWidget() {
    this.mostrarWidget = false;
    localStorage.setItem('widgetCerrado', 'true');
  }

  getPlanNombre(): string {
    const nombres: Record<string, string> = {
      free:         'Free',
      one_time:     'One-Time',
      subscription: 'Premium',
    };
    return nombres[this.planType] ?? 'Free';
  }

  getPlanColor(): string {
    const colores: Record<string, string> = {
      free:         '#6c757d',
      one_time:     '#d4a373',
      subscription: '#606c38',
    };
    return colores[this.planType] ?? '#6c757d';
  }

  // Alias para el template — planActual referenciado en el HTML original
  get planActual(): string {
    return this.planType;
  }
}