import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { PaymentService } from '../services/payment/payment.service';
import { NotificationService } from '../services/notification/notification.service';
import { Observable, map, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PlanGuard implements CanActivate {
  
  constructor(
    private paymentService: PaymentService,
    private router: Router,
    private notifService: NotificationService
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    
    // Verificar si el usuario está autenticado
    const token = localStorage.getItem('token');
    if (!token) {
      this.notifService.showError('Acceso denegado', 'Debes iniciar sesión primero.');
      this.router.navigate(['/login']);
      return of(false);
    }

    // Obtener el plan mínimo requerido de la ruta (si existe)
    const planRequerido = route.data['planRequerido'] || null;

    if (!planRequerido) {
      // Si no hay plan requerido, permitir acceso
      return of(true);
    }

    // Verificar el plan del usuario
    return this.paymentService.getMiPlan().pipe(
      map((response: any) => {
        const planActual = response.plan;

        // Jerarquía de planes: free < one_time < unlimited
        const jerarquia: { [key: string]: number } = {
          'free': 0,
          'one_time': 1,
          'unlimited': 2
        };

        const nivelActual = jerarquia[planActual] || 0;
        const nivelRequerido = jerarquia[planRequerido] || 0;

        if (nivelActual >= nivelRequerido) {
          return true; // Tiene acceso
        } else {
          // No tiene el plan necesario
          this.notifService.showError(
            'Plan Premium Requerido',
            'Esta función requiere un plan superior. Actualiza tu plan para continuar.'
          );
          this.router.navigate(['/pricing']);
          return false;
        }
      }),
      catchError((error) => {
        console.error('Error verificando plan:', error);
        this.notifService.showError('Error', 'No se pudo verificar tu plan.');
        return of(false);
      })
    );
  }
}