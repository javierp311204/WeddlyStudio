import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from '../services/notification/notification.service';
import { Observable, map, catchError, of } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../../environments/environment';

const PLAN_HIERARCHY: Record<string, number> = {
  free: 0,
  one_time: 1,
  subscription: 2,
};

const PLAN_LIMITS: Record<
  string,
  { max_guests: number; max_photos: number; max_weddings: number }
> = {
  free: { max_guests: 40, max_photos: 20, max_weddings: 1 },
  one_time: { max_guests: -1, max_photos: 80, max_weddings: 1 },
  subscription: { max_guests: -1, max_photos: 80, max_weddings: -1 },
};

@Injectable({ providedIn: 'root' })
export class PlanGuard implements CanActivate {
  constructor(
    private http: HttpClient,
    private router: Router,
    private notifService: NotificationService,
    private translate: TranslateService,
  ) {}

  private apiUrl = environment.apiUrl;

  canActivate(
    route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot,
  ): Observable<boolean> {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      this.notifService.showError(
        this.translate.instant('ERRORS.ACCESS_DENEGATED_TITLE'),
        this.translate.instant('ERRORS.ACCESS_DENEGATED_DESC'),
      );
      this.router.navigate(['/login']);
      return of(false);
    }

    const planRequerido: string | null = route.data['planRequerido'] ?? null;
    const checkFeature: string | null = route.data['checkFeature'] ?? null;

    const weddingId = localStorage.getItem('weddingId');
    if (!weddingId) {
      this.router.navigate(['/pricing']);
      return of(false);
    }

    // Si no hay restricción de plan ni feature, permitir directamente
    if (!planRequerido && !checkFeature) return of(true);

    // FIX: leer el plan del USUARIO (can-create devuelve el plan activo del usuario)
    // en vez de el plan_type de la boda (que siempre es 'free' por defecto)
    return this.http
      .get<any>(
        `${this.apiUrl}/weddings/can-create`,
      )
      .pipe(
        map((response) => {
          // can-create devuelve { success, data: { allowed, plan, limit, current } }
          const planActual: string =
            response?.data?.plan ?? response?.plan ?? 'free';

          // ── Verificar feature específica ──────────────────────
          if (checkFeature === 'multi_wedding') {
            const limits = PLAN_LIMITS[planActual] ?? PLAN_LIMITS['free'];
            if (limits.max_weddings === 1) {
              this.notifService.showError(
                this.translate.instant('ERRORS.PLAN_PREMIUM_REQUIRED_TITLE'),
                this.translate.instant('ERRORS.PLAN_PREMIUM_REQUIRED_DESC'),
              );
              this.router.navigate(['/pricing'], {
                queryParams: { reason: 'multi_wedding' },
              });
              return false;
            }
          }

          // ── Verificar plan mínimo requerido ───────────────────
          if (planRequerido) {
            const nivelActual = PLAN_HIERARCHY[planActual] ?? 0;
            const nivelRequerido = PLAN_HIERARCHY[planRequerido] ?? 0;

            if (nivelActual < nivelRequerido) {
              this.notifService.showError(
                this.translate.instant('ERRORS.PLAN_REQUIRED_TITLE'),
                this.translate.instant('ERRORS.PLAN_REQUIRED_DESC'),
              );
              this.router.navigate(['/pricing']);
              return false;
            }
          }

          return true;
        }),
        catchError((error) => {
          console.error('PlanGuard: Error verificando plan:', error);
          return of(true);
        }),
      );
  }

  static canUseFeature(
    feature: 'multi_wedding' | 'unlimited_guests' | 'unlimited_photos',
    plan: string,
  ): boolean {
    const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS['free'];
    switch (feature) {
      case 'multi_wedding':
        return limits.max_weddings !== 1;
      case 'unlimited_guests':
        return limits.max_guests === -1;
      case 'unlimited_photos':
        return limits.max_photos > 20;
      default:
        return false;
    }
  }
}
