import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PaymentService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getPlanes(): Observable<any> {
    return this.http.get(`${this.apiUrl}/plans`);
  }

  getMiPlan(): Observable<any> {
    return this.http.get(`${this.apiUrl}/subscriptions/current`);
  }

  cancelarSuscripcion(cancelImmediately = false): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/subscriptions/current/cancel`,
      { body: { cancel_immediately: cancelImmediately } }
    );
  }

  crearSesionStripe(planId: string, weddingId?: string, interval: 'month' | 'year' = 'month'): Observable<any> {
    const body: any = { plan_id: planId, interval };
    if (weddingId) body.wedding_id = weddingId;
    return this.http.post(`${this.apiUrl}/payments/checkout/stripe`, body);
  }

  crearOrdenPaypal(planId: string, weddingId?: string): Observable<any> {
    const body: any = { plan_id: planId };
    if (weddingId) body.wedding_id = weddingId;
    return this.http.post(`${this.apiUrl}/payments/checkout/paypal`, body);
  }

  capturarPaypal(orderId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/payments/checkout/paypal/capture/${orderId}`,
      {}
    );
  }

  getHistorial(page = 1, limit = 20, status?: string): Observable<any> {
    let params = new HttpParams()
      .set('page', page)
      .set('limit', limit);
    if (status) params = params.set('status', status);
    return this.http.get(`${this.apiUrl}/payments`, { params });
  }

  getPago(paymentId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/payments/${paymentId}`);
  }

  async crearPagoUnico(planId: string, weddingId?: string): Promise<void> {
    const res: any = await this.crearSesionStripe(planId, weddingId).toPromise();
    const url = res?.data?.url ?? res?.url;
    if (url) window.location.href = url;
    else throw new Error('No se recibió URL de Stripe');
  }

  async crearSuscripcion(planId: string, weddingId?: string): Promise<void> {
    const res: any = await this.crearSesionStripe(planId, weddingId, 'month').toPromise();
    const url = res?.data?.url ?? res?.url;
    if (url) window.location.href = url;
    else throw new Error('No se recibió URL de Stripe');
  }
}