// src/app/services/payment/payment.service.ts
// Actualizado para Weddly API v2
//
// CAMBIOS PRINCIPALES vs backend viejo:
// - /api/pagos/planes                      → /api/plans  (público, sin auth)
// - /api/pagos/mi-plan                     → /api/subscriptions/current
// - /api/pagos/verificar-limites           → incluido en /api/subscriptions/current
// - /api/pagos/crear-sesion-pago-unico     → /api/payments/checkout/stripe
// - /api/pagos/crear-suscripcion           → /api/payments/checkout/stripe  (mode distinto)
// - /api/pagos/cancelar-suscripcion        → DELETE /api/subscriptions/current/cancel
// - Se añade soporte para PayPal

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface StripeCheckoutResponse {
  success: boolean;
  data: {
    url:        string;
    session_id: string;
  };
}

export interface PaypalOrderResponse {
  success: boolean;
  data: {
    order_id:     string;
    approval_url: string;
  };
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private API_URL = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  // ════════════════════════════════════════
  // PLANES
  // ════════════════════════════════════════

  /**
   * Lista planes activos. Público, sin auth.
   * Antes: GET /api/pagos/planes
   */
  getPlanes(): Observable<any> {
    return this.http.get(`${this.API_URL}/plans`);
  }

  // ════════════════════════════════════════
  // SUSCRIPCIÓN ACTUAL
  // ════════════════════════════════════════

  /**
   * Devuelve la suscripción activa + datos del plan.
   * Si no hay suscripción activa, devuelve el plan Free con { is_free: true }.
   * Antes: GET /api/pagos/mi-plan
   */
  getMiPlan(): Observable<any> {
    return this.http.get(`${this.API_URL}/subscriptions/current`);
  }

  /**
   * Historial paginado de pagos.
   * Filtros opcionales: status, page, limit
   */
  getHistorialPagos(page = 1, limit = 20, status?: string): Observable<any> {
    let url = `${this.API_URL}/payments?page=${page}&limit=${limit}`;
    if (status) url += `&status=${status}`;
    return this.http.get(url);
  }

  // ════════════════════════════════════════
  // CHECKOUT — STRIPE
  // ════════════════════════════════════════

  /**
   * Crea una Stripe Checkout Session para pago único (one_time).
   * Redirige automáticamente al usuario a la URL de Stripe.
   * Antes: POST /api/pagos/crear-sesion-pago-unico
   */
  async crearPagoUnico(planId: string, weddingId?: string): Promise<void> {
    try {
      const response = await this.http.post<StripeCheckoutResponse>(
        `${this.API_URL}/payments/checkout/stripe`,
        { plan_id: planId, wedding_id: weddingId, interval: 'month' },
      ).toPromise();

      if (response?.data?.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('No se recibió URL de checkout de Stripe');
      }
    } catch (error) {
      console.error('[PaymentService] Error creando pago único:', error);
      throw error;
    }
  }

  /**
   * Crea una Stripe Checkout Session para suscripción recurrente.
   * Antes: POST /api/pagos/crear-suscripcion
   */
  async crearSuscripcion(planId: string, weddingId?: string, interval: 'month' | 'year' = 'month'): Promise<void> {
    try {
      const response = await this.http.post<StripeCheckoutResponse>(
        `${this.API_URL}/payments/checkout/stripe`,
        { plan_id: planId, wedding_id: weddingId, interval },
      ).toPromise();

      if (response?.data?.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('No se recibió URL de checkout de Stripe');
      }
    } catch (error) {
      console.error('[PaymentService] Error creando suscripción:', error);
      throw error;
    }
  }

  // ════════════════════════════════════════
  // CHECKOUT — PAYPAL (nuevo)
  // ════════════════════════════════════════

  /**
   * Crea una PayPal Order y redirige al usuario a PayPal para aprobarla.
   */
  async crearPagoPaypal(planId: string, weddingId?: string): Promise<void> {
    try {
      const response = await this.http.post<PaypalOrderResponse>(
        `${this.API_URL}/payments/checkout/paypal`,
        { plan_id: planId, wedding_id: weddingId },
      ).toPromise();

      if (response?.data?.approval_url) {
        window.location.href = response.data.approval_url;
      } else {
        throw new Error('No se recibió approval_url de PayPal');
      }
    } catch (error) {
      console.error('[PaymentService] Error creando pago PayPal:', error);
      throw error;
    }
  }

  /**
   * Captura una orden PayPal tras la aprobación del usuario.
   * Llamar desde la página /pago-exitoso con el orderId de los query params.
   */
  capturarOrdenPaypal(orderId: string): Observable<any> {
    return this.http.post(
      `${this.API_URL}/payments/checkout/paypal/capture/${orderId}`,
      {},
    );
  }

  // ════════════════════════════════════════
  // CANCELACIÓN
  // ════════════════════════════════════════

  /**
   * Cancela la suscripción activa.
   * Por defecto cancela al final del período (el usuario mantiene acceso hasta que venza).
   * Con cancelImmediately=true cancela de inmediato.
   * Antes: POST /api/pagos/cancelar-suscripcion
   */
  cancelarSuscripcion(cancelImmediately = false): Observable<any> {
    return this.http.delete(`${this.API_URL}/subscriptions/current/cancel`, {
      body: { cancel_immediately: cancelImmediately },
    });
  }
}