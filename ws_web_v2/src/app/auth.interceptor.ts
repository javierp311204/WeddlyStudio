import { HttpInterceptorFn, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';
import { HttpClient } from '@angular/common/http';

// Estado compartido para serializar refreshes concurrentes
let isRefreshing = false;
const refreshDone$ = new BehaviorSubject<string | null>(null);
const API_URL = 'http://localhost:3000/api';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const http   = inject(HttpClient);

  const isRefreshCall = req.url.includes('/auth/refresh');
  const token = localStorage.getItem('token');
  const authedReq = (token && !isRefreshCall) ? addToken(req, token) : req;

  return next(authedReq).pipe(
    catchError((error: HttpErrorResponse) => {

      if (error.status !== 401 || isRefreshCall) {
        return throwError(() => error);
      }

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        clearSession(router);
        return throwError(() => error);
      }

      // Si ya hay un refresh en vuelo, encolar y esperar
      if (isRefreshing) {
        return refreshDone$.pipe(
          filter(t => t !== null),
          take(1),
          switchMap(newToken => next(addToken(req, newToken!))),
        );
      }

      isRefreshing = true;
      refreshDone$.next(null);

      return http.post<any>(`${API_URL}/auth/refresh`, { refresh_token: refreshToken }).pipe(
        switchMap(res => {
          const newToken: string | undefined = res?.data?.access_token;
          if (!newToken) { clearSession(router); return throwError(() => error); }

          localStorage.setItem('token', newToken);
          isRefreshing = false;
          refreshDone$.next(newToken);
          return next(addToken(req, newToken));
        }),
        catchError(refreshErr => {
          isRefreshing = false;
          refreshDone$.next(null);
          clearSession(router);
          return throwError(() => refreshErr);
        }),
      );
    }),
  );
};

function addToken(req: HttpRequest<unknown>, token: string) {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function clearSession(router: Router) {
  ['token','refresh_token','userId','userEmail','firstName','lastName','rol','weddingId']
    .forEach(k => localStorage.removeItem(k));
  router.navigate(['/login']);
}