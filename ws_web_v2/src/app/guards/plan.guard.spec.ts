import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { PlanGuard } from './plan.guard';
import { NotificationService } from '../services/notification/notification.service';

describe('PlanGuard', () => {
  let guard: PlanGuard;
  let httpMock: HttpTestingController;
  let routerSpy: { navigate: jasmine.Spy };
  let notifSpy: jasmine.SpyObj<NotificationService>;

  const API_URL = 'http://localhost:3000/api/subscriptions/current';

  // Helper para crear un ActivatedRouteSnapshot con data
  const mockRoute = (planRequerido?: string): ActivatedRouteSnapshot => {
    const route = new ActivatedRouteSnapshot();
    (route as any).data = planRequerido ? { planRequerido } : {};
    return route;
  };
  const mockState = {} as RouterStateSnapshot;

  beforeEach(() => {
    routerSpy = { navigate: jasmine.createSpy('navigate') };
    notifSpy = jasmine.createSpyObj('NotificationService', ['showError', 'showSuccess']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        PlanGuard,
        { provide: Router, useValue: routerSpy },
        { provide: NotificationService, useValue: notifSpy },
      ],
    });

    guard = TestBed.inject(PlanGuard);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('debe denegar acceso y redirigir a /login si no hay token', (done) => {
    guard.canActivate(mockRoute('one_time'), mockState).subscribe((result) => {
      expect(result).toBeFalse();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
      done();
    });
  });

  it('debe permitir acceso si no hay planRequerido en la ruta', (done) => {
    localStorage.setItem('token', 'fake-token');
    guard.canActivate(mockRoute(), mockState).subscribe((result) => {
      expect(result).toBeTrue();
      done();
    });
  });

  it('debe permitir acceso si el plan actual es suficiente (free >= free)', (done) => {
    localStorage.setItem('token', 'fake-token');
    guard.canActivate(mockRoute('free'), mockState).subscribe((result) => {
      expect(result).toBeTrue();
      done();
    });
    // v2: respuesta de /subscriptions/current
    httpMock.expectOne(API_URL).flush({ plan: { type: 'free' }, is_free: true });
  });

  it('debe permitir acceso si el plan es subscription (mayor nivel)', (done) => {
    localStorage.setItem('token', 'fake-token');
    guard.canActivate(mockRoute('one_time'), mockState).subscribe((result) => {
      expect(result).toBeTrue();
      done();
    });
    httpMock.expectOne(API_URL).flush({ plan: { type: 'subscription' }, is_free: false });
  });

  it('debe denegar acceso y redirigir a /pricing si el plan es insuficiente', (done) => {
    localStorage.setItem('token', 'fake-token');
    guard.canActivate(mockRoute('subscription'), mockState).subscribe((result) => {
      expect(result).toBeFalse();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/pricing']);
      expect(notifSpy.showError).toHaveBeenCalled();
      done();
    });
    httpMock.expectOne(API_URL).flush({ plan: { type: 'free' }, is_free: true });
  });

  it('debe denegar acceso si la API falla', (done) => {
    localStorage.setItem('token', 'fake-token');
    guard.canActivate(mockRoute('one_time'), mockState).subscribe((result) => {
      expect(result).toBeFalse();
      expect(notifSpy.showError).toHaveBeenCalled();
      done();
    });
    httpMock.expectOne(API_URL).error(new ProgressEvent('error'));
  });
});