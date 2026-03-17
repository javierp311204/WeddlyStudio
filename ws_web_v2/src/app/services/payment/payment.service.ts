import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PaymentService {

  private apiUrl = 'https://weddly-api-production.up.railway.app/api';

  constructor(private http: HttpClient) {}

  private getHeaders(): { headers: HttpHeaders } {
    const token = localStorage.getItem('token');
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  // ─────────────────────────────────────────────────────────
  // PLANES — público, sin auth
  // GET /api/plans
  // ─────────────────────────────────────────────────────────

  getPlanes(): Observable<any> {
    return this.http.get(`${this.apiUrl}/plans`);
  }

  // ─────────────────────────────────────────────────────────
  // SUSCRIPCIÓN ACTUAL
  // GET /api/subscriptions/current
  // ─────────────────────────────────────────────────────────

  getMiPlan(): Observable<any> {
    return this.http.get(`${this.apiUrl}/subscriptions/current`, this.getHeaders());
  }

  // ─────────────────────────────────────────────────────────
  // CANCELAR SUSCRIPCIÓN
  // DELETE /api/subscriptions/current/cancel
  // ─────────────────────────────────────────────────────────

  cancelarSuscripcion(cancelImmediately = false): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/subscriptions/current/cancel`,
      { ...this.getHeaders(), body: { cancel_immediately: cancelImmediately } }
    );
  }

  // ─────────────────────────────────────────────────────────
  // STRIPE CHECKOUT
  // POST /api/payments/checkout/stripe
  // Devuelve { url, session_id } → el frontend redirige a url
  // ─────────────────────────────────────────────────────────

  crearSesionStripe(planId: string, weddingId?: string, interval: 'month' | 'year' = 'month'): Observable<any> {
    const body: any = { plan_id: planId, interval };
    if (weddingId) body.wedding_id = weddingId;
    return this.http.post(`${this.apiUrl}/payments/checkout/stripe`, body, this.getHeaders());
  }

  // ─────────────────────────────────────────────────────────
  // PAYPAL ORDER
  // POST /api/payments/checkout/paypal
  // Devuelve { order_id, approval_url } → el frontend redirige a approval_url
  // ─────────────────────────────────────────────────────────

  crearOrdenPaypal(planId: string, weddingId?: string): Observable<any> {
    const body: any = { plan_id: planId };
    if (weddingId) body.wedding_id = weddingId;
    return this.http.post(`${this.apiUrl}/payments/checkout/paypal`, body, this.getHeaders());
  }

  // ─────────────────────────────────────────────────────────
  // PAYPAL CAPTURE
  // POST /api/payments/checkout/paypal/capture/:orderId
  // ─────────────────────────────────────────────────────────

  capturarPaypal(orderId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/payments/checkout/paypal/capture/${orderId}`,
      {},
      this.getHeaders()
    );
  }

  // ─────────────────────────────────────────────────────────
  // HISTORIAL DE PAGOS
  // GET /api/payments?page=1&limit=20&status=completed
  // ─────────────────────────────────────────────────────────

  getHistorial(page = 1, limit = 20, status?: string): Observable<any> {
    let params = new HttpParams()
      .set('page', page)
      .set('limit', limit);
    if (status) params = params.set('status', status);
    return this.http.get(`${this.apiUrl}/payments`, { ...this.getHeaders(), params });
  }

  // ─────────────────────────────────────────────────────────
  // DETALLE DE UN PAGO
  // GET /api/payments/:paymentId
  // ─────────────────────────────────────────────────────────

  getPago(paymentId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/payments/${paymentId}`, this.getHeaders());
  }

  // ─────────────────────────────────────────────────────────
  // HELPERS usados desde pricing.component.ts
  // Encapsulan la lógica de: crear sesión → redirigir al checkout
  // ─────────────────────────────────────────────────────────

  /**
   * Plan one_time: crea sesión Stripe y redirige al checkout.
   * El plan one_time NO es una suscripción recurrente — usa payment_intent.
   */
  async crearPagoUnico(planId: string, weddingId?: string): Promise<void> {
    const res: any = await this.crearSesionStripe(planId, weddingId).toPromise();
    const url = res?.data?.url ?? res?.url;
    if (url) window.location.href = url;
    else throw new Error('No se recibió URL de Stripe');
  }

  /**
   * Plan subscription: crea sesión Stripe con billing_period_end y redirige.
   */
  async crearSuscripcion(planId: string, weddingId?: string): Promise<void> {
    const res: any = await this.crearSesionStripe(planId, weddingId, 'month').toPromise();
    const url = res?.data?.url ?? res?.url;
    if (url) window.location.href = url;
    else throw new Error('No se recibió URL de Stripe');
  }
}