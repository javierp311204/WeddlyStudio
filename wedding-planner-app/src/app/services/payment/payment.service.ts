import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private API_URL = 'http://localhost:3000/api/pagos';

  constructor(private http: HttpClient) {}

  // Obtener todos los planes disponibles
  getPlanes(): Observable<any> {
    return this.http.get(`${this.API_URL}/planes`);
  }

  // Obtener plan actual del usuario
  getMiPlan(): Observable<any> {
    return this.http.get(`${this.API_URL}/mi-plan`);
  }

  // Verificar límites del usuario
  verificarLimites(): Observable<any> {
    return this.http.get(`${this.API_URL}/verificar-limites`);
  }

  // ✅ ARREGLADO: Crear sesión de pago único
  async crearPagoUnico() {
    try {
      const response: any = await this.http.post(`${this.API_URL}/crear-sesion-pago-unico`, {}).toPromise();
      
      // ✅ Redirigir directamente usando la URL que devuelve Stripe
      if (response.url) {
        window.location.href = response.url;
      } else {
        throw new Error('No se recibió URL de checkout');
      }
    } catch (error) {
      console.error('Error creando pago único:', error);
      throw error;
    }
  }

  // ✅ ARREGLADO: Crear suscripción
  async crearSuscripcion() {
    try {
      const response: any = await this.http.post(`${this.API_URL}/crear-suscripcion`, {}).toPromise();
      
      // ✅ Redirigir directamente usando la URL que devuelve Stripe
      if (response.url) {
        window.location.href = response.url;
      } else {
        throw new Error('No se recibió URL de checkout');
      }
    } catch (error) {
      console.error('Error creando suscripción:', error);
      throw error;
    }
  }

  // Cancelar suscripción
  cancelarSuscripcion(): Observable<any> {
    return this.http.post(`${this.API_URL}/cancelar-suscripcion`, {});
  }
}