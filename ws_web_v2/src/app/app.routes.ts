import { Routes } from '@angular/router';
import { Component } from '@angular/core';

// ── Componente vacío para rutas que solo redirigen via guard ──
@Component({ standalone: true, template: '' })
class EmptyComponent {}

import { AlbumDigitalComponent }       from './components/album-digital/album-digital.component';
import { DisenoPapeleriaComponent }    from './components/diseno-papeleria/diseno-papeleria.component';
import { HomeComponent }               from './components/home/home.component';
import { DashboardComponent }          from './components/dashboard/dashboard.component';
import { LoginComponent }              from './components/login/login.component';
import { MesaManagerComponent }        from './components/mesa-manager/mesa-manager.component';
import { authGuard, adminGuard, weddingOwnerGuard, minRoleGuard } from './guards/auth.guard';
import { localeGuard, rootLocaleRedirectGuard, marketingLocaleRedirectGuard } from './guards/locale.guard';
import { RegisterComponent }           from './components/register/register.component';
import { InfoBodaComponent }           from './components/info-boda/info-boda.component';
import { ListaInvitadosComponent }     from './components/lista-invitados/lista-invitados.component';
import { PlanoInteractivoComponent }   from './components/plano-interactivo/plano-interactivo.component';
import { ChecklistBodaComponent }      from './components/checklist-boda/checklist-boda.component';
import { PlanGuard }                   from './guards/plan.guard';
import { VerificarEmailComponent }     from './pages/verificar-email/verificar-email.component';
import { OnboardingComponent }         from './components/onboarding/onboarding.component';
import { RsvpComponent }               from './components/rsvp/rsvp.component';
import { PricingComponent }            from './pages/pricing/pricing.component';
import { PagoExitosoComponent }        from './pages/pago-exitoso/pago-exitoso.component';
import { PagoCanceladoComponent }      from './pages/pago-cancelado/pago-cancelado.component';
import { PerfilUsuarioComponent }      from './components/perfil-usuario/perfil-usuario.component';
import { MisBodasComponent }           from './components/mis-bodas/mis-bodas.component';
import { ResetearPasswordComponent }   from './pages/resetear-password/resetear-password.component';
import { RecuperarPasswordComponent }  from './pages/recuperar-password/recuperar-password.component';
import { TerminosComponent }           from './components/terminos/terminos.component';
import { PrivacidadComponent }         from './components/privacidad/privacidad.component';
import { ColaboradoresComponent }      from './components/colaboradores/colaboradores.component';
import { InviteAcceptComponent }       from './components/invite-accept/invite-accept.component';
import { TwoFactorComponent }          from './components/two-factor/two-factor.component';
import { TfaResetConfirmComponent }    from './components/tfa-reset-confirm/tfa-reset-confirm.component';
import { Perfil2faComponent }          from './components/perfil2fa/perfil2fa.component';
import { CalendarioPageComponent }     from './pages/calendario-page/calendario-page.component';
import { BudgetPlannerComponent }      from './pages/budget-planner/budget-planner.component';
import { FaqComponent }                from './components/faq/faq.component';
import { SoporteComponent }            from './components/soporte/soporte.component';

// ── Componente layout para rutas con prefijo de idioma ────────
@Component({
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
class LangLayoutComponent {}

import { RouterOutlet } from '@angular/router';

export const routes: Routes = [

  // ── Raíz → detecta idioma y redirige a /{lang}/home ─────────
  {
    path: '',
    component: EmptyComponent,
    canActivate: [rootLocaleRedirectGuard],
    pathMatch: 'full',
  },

  // ── Rutas públicas sin prefijo de idioma ─────────────────────
  // (deben ir ANTES de /:lang para que Angular no las capture como :lang)
  { path: 'login',                    component: LoginComponent },
  { path: 'register',                 component: RegisterComponent },
  { path: 'verify-email/:token',      component: VerificarEmailComponent },
  { path: 'reset-pass',               component: ResetearPasswordComponent },
  { path: 'reco-pass',                component: RecuperarPasswordComponent },
  { path: 'rsvp/:code',               component: RsvpComponent },
  { path: 'invites/accept/:token',    component: InviteAcceptComponent },

  // ── Rutas 2FA ─────────────────────────────────────────────────
  { path: 'auth/2fa',                 component: TwoFactorComponent },
  { path: 'auth/2fa-reset',           component: TfaResetConfirmComponent },

  // ── Rutas de pago ─────────────────────────────────────────────
  { path: 'payment/success',          component: PagoExitosoComponent },
  { path: 'payment/cancel',           component: PagoCanceladoComponent },

  // ── Rutas autenticadas sin boda ───────────────────────────────
  { path: 'dashboard',    component: DashboardComponent,     canActivate: [authGuard] },
  { path: 'onboarding',   component: OnboardingComponent,    canActivate: [authGuard] },
  { path: 'profile',      component: PerfilUsuarioComponent, canActivate: [authGuard] },
  { path: 'my-weddings',  component: MisBodasComponent,      canActivate: [authGuard] },
  { path: 'profile2fa',   component: Perfil2faComponent,     canActivate: [authGuard] },

  // ── Lectura ───────────────────────────────────────────────────
  { path: 'album',    component: AlbumDigitalComponent,  canActivate: [authGuard, minRoleGuard('guest')] },
  { path: 'calendar', component: CalendarioPageComponent, canActivate: [authGuard, minRoleGuard('planner')] },

  // ── Escritura ─────────────────────────────────────────────────
  {
    path: 'checklist',
    component: ChecklistBodaComponent,
    canActivate: [authGuard, minRoleGuard('planner'), PlanGuard],
    data: { blockOnReadonly: true },
  },
  {
    path: 'wedding-info',
    component: InfoBodaComponent,
    canActivate: [authGuard, minRoleGuard('guest'), PlanGuard],
    data: { blockOnReadonly: true },
  },
  {
    path: 'budget',
    component: BudgetPlannerComponent,
    canActivate: [authGuard],
  },
  {
    path: 'guests',
    component: ListaInvitadosComponent,
    canActivate: [authGuard, minRoleGuard('planner'), PlanGuard],
    data: { blockOnReadonly: true },
  },
  {
    path: 'tables',
    component: MesaManagerComponent,
    canActivate: [authGuard, minRoleGuard('planner'), PlanGuard],
    data: { blockOnReadonly: true },
  },
  {
    path: 'map',
    component: PlanoInteractivoComponent,
    canActivate: [authGuard, minRoleGuard('planner'), PlanGuard],
    data: { blockOnReadonly: true, planRequerido: 'one_time' },
  },
  {
    path: 'design',
    component: DisenoPapeleriaComponent,
    canActivate: [authGuard, minRoleGuard('co_organizer'), PlanGuard],
    data: { blockOnReadonly: true },
  },
  {
    path: 'collaborators',
    component: ColaboradoresComponent,
    canActivate: [authGuard, minRoleGuard('co_organizer'), PlanGuard],
    data: { blockOnReadonly: true },
  },

  // ── Lazy-loaded sin prefijo de idioma ─────────────────────────
  {
    path: 'reviews',
    loadComponent: () =>
      import('./components/reviews/reviews.component').then(m => m.ReviewsComponent),
  },

  // ── Rutas de marketing SIN prefijo → redirigen a /{lang}/ruta ─
  // EmptyComponent + guard para que Angular acepte la ruta
  {
    path: 'home',
    component: EmptyComponent,
    canActivate: [marketingLocaleRedirectGuard],
    pathMatch: 'full',
  },
  {
    path: 'pricing',
    component: EmptyComponent,
    canActivate: [marketingLocaleRedirectGuard],
    pathMatch: 'full',
  },
  {
    path: 'terms',
    component: EmptyComponent,
    canActivate: [marketingLocaleRedirectGuard],
    pathMatch: 'full',
  },
  {
    path: 'privacy',
    component: EmptyComponent,
    canActivate: [marketingLocaleRedirectGuard],
    pathMatch: 'full',
  },
  {
    path: 'faq',
    component: EmptyComponent,
    canActivate: [marketingLocaleRedirectGuard],
    pathMatch: 'full',
  },
  {
    path: 'support',
    component: EmptyComponent,
    canActivate: [marketingLocaleRedirectGuard],
    pathMatch: 'full',
  },
  {
    path: 'wedding-rsvp-tool',
    component: EmptyComponent,
    canActivate: [marketingLocaleRedirectGuard],
    pathMatch: 'full',
  },
  {
    path: 'wedding-seating-chart',
    component: EmptyComponent,
    canActivate: [marketingLocaleRedirectGuard],
    pathMatch: 'full',
  },
  {
    path: 'wedding-guest-list-manager',
    component: EmptyComponent,
    canActivate: [marketingLocaleRedirectGuard],
    pathMatch: 'full',
  },
  {
    path: 'wedding-checklist',
    component: EmptyComponent,
    canActivate: [marketingLocaleRedirectGuard],
    pathMatch: 'full',
  },

  // ── Rutas con prefijo de idioma /:lang ────────────────────────
  // Va AL FINAL para no capturar rutas como /login, /dashboard, etc.
  {
    path: ':lang',
    component: LangLayoutComponent,     // ← outlet para los hijos
    canActivate: [localeGuard],
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home',    component: HomeComponent },
      { path: 'pricing', component: PricingComponent },
      { path: 'terms',   component: TerminosComponent },
      { path: 'privacy', component: PrivacidadComponent },
      { path: 'faq',     component: FaqComponent },
      { path: 'support', component: SoporteComponent },
      {
        path: 'wedding-rsvp-tool',
        loadComponent: () =>
          import('./pages/rsvp-landing/rsvp-landing.component').then(m => m.RsvpLandingComponent),
      },
      {
        path: 'wedding-seating-chart',
        loadComponent: () =>
          import('./pages/wedding-seating-chart/wedding-seating-chart.component').then(m => m.WeddingSeatingChartComponent),
      },
      {
        path: 'wedding-guest-list-manager',
        loadComponent: () =>
          import('./pages/lista-invitados-boda/lista-invitados-boda.component').then(m => m.ListaInvitadosBodaComponent),
      },
      {
        path: 'wedding-checklist',
        loadComponent: () =>
          import('./pages/wedding-checklist/wedding-checklist.component').then(m => m.WeddingChecklistComponent),
      },
    ],
  },

  // ── 404 — siempre al final ────────────────────────────────────
  {
    path: '**',
    loadComponent: () =>
      import('./components/notfound404/notfound404.component').then(m => m.NotFoundComponent),
  },
];