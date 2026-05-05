import { Routes } from '@angular/router';
import { AlbumDigitalComponent }       from './components/album-digital/album-digital.component';
import { DisenoPapeleriaComponent }    from './components/diseno-papeleria/diseno-papeleria.component';
import { HomeComponent }               from './components/home/home.component';
import { DashboardComponent }          from './components/dashboard/dashboard.component'; // ← NUEVO
import { LoginComponent }              from './components/login/login.component';
import { MesaManagerComponent }        from './components/mesa-manager/mesa-manager.component';
import { authGuard, adminGuard, weddingOwnerGuard, minRoleGuard } from './guards/auth.guard';
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
import { FaqComponent }                from './components/faq/faq.component';
import { SoporteComponent }            from './components/soporte/soporte.component';

export const routes: Routes = [

  // ── Rutas públicas ──────────────────────────────────────────
  { path: '',                       redirectTo: 'home', pathMatch: 'full' },
  { path: 'home',                   component: HomeComponent },       
  { path: 'login',                  component: LoginComponent },
  { path: 'register',               component: RegisterComponent },
  { path: 'verify-email/:token',    component: VerificarEmailComponent },
  { path: 'reset-pass',             component: ResetearPasswordComponent },
  { path: 'reco-pass',              component: RecuperarPasswordComponent },
  { path: 'rsvp/:code',             component: RsvpComponent },
  { path: 'terms',                  component: TerminosComponent },
  { path: 'privacy',                component: PrivacidadComponent },
  { path: 'invites/accept/:token',  component: InviteAcceptComponent },
  { path: 'pricing',                component: PricingComponent },
  { path: 'faq',                    component: FaqComponent },
  { path: 'support',                component: SoporteComponent },

  // ── Rutas 2FA ───────────────────────────────────────────────
  { path: 'auth/2fa',               component: TwoFactorComponent },
  { path: 'auth/2fa-reset',         component: TfaResetConfirmComponent },

  // ── Rutas de pago ───────────────────────────────────────────
  { path: 'payment/success',        component: PagoExitosoComponent },
  { path: 'payment/cancel',         component: PagoCanceladoComponent },

  // ── Autenticadas — sin restricción de boda ──────────────────
  { path: 'dashboard',   component: DashboardComponent,     canActivate: [authGuard] }, 
  { path: 'onboarding',  component: OnboardingComponent,    canActivate: [authGuard] },
  { path: 'profile',     component: PerfilUsuarioComponent, canActivate: [authGuard] },
  { path: 'my-weddings', component: MisBodasComponent,      canActivate: [authGuard] },
  { path: 'profile2fa',  component: Perfil2faComponent,     canActivate: [authGuard] },

  // ── Lectura (readonly/archived pueden entrar, no editar) ────
  { path: 'album',    component: AlbumDigitalComponent,   canActivate: [authGuard, minRoleGuard('guest')] },
  { path: 'calendar', component: CalendarioPageComponent,  canActivate: [authGuard, minRoleGuard('planner')] },

  // ── Escritura — se bloquean si boda es readonly o archived ──
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

  {
    path: 'reviews',
    loadComponent: () =>
      import('./components/reviews/reviews.component').then(m => m.ReviewsComponent),
  },
  {
    path: 'wedding-guest-list-manager',
    loadComponent: () =>
      import('./pages/lista-invitados-boda/lista-invitados-boda.component').then(m => m.ListaInvitadosBodaComponent),
  },

  // ── Fallback ────────────────────────────────────────────────
  {
    path: '**',
    loadComponent: () =>
      import('./components/notfound404/notfound404.component')
        .then(m => m.NotFoundComponent),
  },
];