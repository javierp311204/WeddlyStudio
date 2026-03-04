import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from '../services/notification/notification.service';
import { Observable, map, catchError, of } from 'rxjs';

// ─────────────────────────────────────────────────────────────
// FIXES aplicados:
//  • GestionService eliminado — no se usaba, rompía compilación
//  • HttpClient inyectado normal (import() dinámico no funciona en constructores)
//  • Plan types v2: 'free' | 'one_time' | 'subscription'
// ─────────────────────────────────────────────────────────────

const PLAN_HIERARCHY: Record<string, number> = {
  free:         0,
  one_time:     1,
  subscription: 2,
};

@Injectable({ providedIn: 'root' })
export class PlanGuard implements CanActivate {

  constructor(
    private http: HttpClient,          // inyección normal, no import() dinámico
    private router: Router,
    private notifService: NotificationService,
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot,
  ): Observable<boolean> {

    const token = localStorage.getItem('token');
    if (!token) {
      this.notifService.showError('Acceso denegado', 'Debes iniciar sesión primero.');
      this.router.navigate(['/login']);
      return of(false);
    }

    const planRequerido: string | null = route.data['planRequerido'] ?? null;
    if (!planRequerido) return of(true);

    // El authInterceptor añade el Bearer token — no hace falta cabecera manual
    return this.http.get<any>('http://localhost:3000/api/subscriptions/current').pipe(
      map((response) => {
        const planActual: string =
          response?.data?.plan?.plan_type ??
          response?.plan?.type ??
          response?.subscription?.plan_type ??
          'free';

        const nivelActual    = PLAN_HIERARCHY[planActual]    ?? 0;
        const nivelRequerido = PLAN_HIERARCHY[planRequerido] ?? 0;

        if (nivelActual >= nivelRequerido) return true;

        this.notifService.showError(
          'Plan Premium Requerido',
          'Esta función requiere un plan superior. Actualiza tu plan para continuar.',
        );
        this.router.navigate(['/pricing']);
        return false;
      }),
      catchError((error) => {
        console.error('PlanGuard: Error verificando plan:', error);
        this.notifService.showError('Error', 'No se pudo verificar tu plan.');
        return of(false);
      }),
    );
  }
}