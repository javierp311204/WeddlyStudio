import { HttpInterceptorFn, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { NotificationService } from './services/notification/notification.service';

let isRefreshing = false;
const refreshDone$ = new BehaviorSubject<boolean>(false);
const API_URL = environment.apiUrl;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const http   = inject(HttpClient);
  const notif  = inject(NotificationService);

  if (req.url.includes('formspree.io')) {
    return next(req);
  }

  const authedReq = req.clone({ withCredentials: true });

  return next(authedReq).pipe(
    catchError((error: HttpErrorResponse) => {

      // Rate limit
      if (error.status === 429) {
        const retryAfter = error.headers.get('Retry-After');
        const minutes = retryAfter ? Math.ceil(Number(retryAfter) / 60) : 15;
        notif.showError('Demasiados intentos', `Por favor, espera ${minutes} minutos.`);
        return throwError(() => error);
      }

      const isRefreshCall = req.url.includes('/auth/refresh');
      if (error.status !== 401 || isRefreshCall) {
        return throwError(() => error);
      }

      // Si ya hay un refresh en vuelo, esperar
      if (isRefreshing) {
        return refreshDone$.pipe(
          filter(done => done),
          take(1),
          switchMap(() => next(authedReq)),
        );
      }

      isRefreshing = true;
      refreshDone$.next(false);

      return http.post<any>(`${API_URL}/auth/refresh`, {}, { withCredentials: true }).pipe(
        switchMap(() => {
          isRefreshing = false;
          refreshDone$.next(true);
          return next(authedReq);
        }),
        catchError(refreshErr => {
          isRefreshing = false;
          refreshDone$.next(false);
          clearSession(router);
          return throwError(() => refreshErr);
        }),
      );
    }),
  );
};

function isPublicRoute(router: Router) {
  const publicPaths = ['/', '/home', '/login', '/register', '/pricing', '/terms', '/privacy', '/rsvp'];
  const currentUrl = router.url.split('?')[0].split('#')[0];
  return publicPaths.some(path =>
    currentUrl === path || currentUrl.startsWith(path + '/')
  );
}

function clearSession(router: Router) {
  ['userId', 'userEmail', 'firstName', 'lastName', 'rol',
   'weddingId', 'weddingRole', 'avatarUrl', 'weddingStatus', 'weddingReadonlyReason']
    .forEach(k => localStorage.removeItem(k));
  if (!isPublicRoute(router)) {
    router.navigate(['/login']);
  }
}