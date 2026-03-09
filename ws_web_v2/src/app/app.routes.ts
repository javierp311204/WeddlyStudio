import { Routes } from '@angular/router';
import { AlbumDigitalComponent }       from './components/album-digital/album-digital.component';
import { DisenoPapeleriaComponent }    from './components/diseno-papeleria/diseno-papeleria.component';
import { HomeComponent }               from './components/home/home.component';
import { LoginComponent }              from './components/login/login.component';
import { MesaManagerComponent }        from './components/mesa-manager/mesa-manager.component';
import { authGuard, adminGuard, weddingOwnerGuard } from './guards/auth.guard';
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
// ── 2FA ──────────────────────────────────────────────────────────────────────
import { TwoFactorComponent }          from './components/two-factor/two-factor.component';
import { TfaResetConfirmComponent }    from './components/tfa-reset-confirm/tfa-reset-confirm.component';
import { Perfil2faComponent }          from './components/perfil2fa/perfil2fa.component';



export const routes: Routes = [

  // ── Rutas públicas ──────────────────────────────────────────
  { path: '',                        redirectTo: 'home', pathMatch: 'full' },
  { path: 'home',                    component: HomeComponent },
  { path: 'login',                   component: LoginComponent },
  { path: 'register',                component: RegisterComponent },
  { path: 'verify-email/:token',     component: VerificarEmailComponent },
  { path: 'reset-pass',              component: ResetearPasswordComponent },
  { path: 'reco-pass',               component: RecuperarPasswordComponent },
  { path: 'rsvp/:code',              component: RsvpComponent },

  // ── Rutas 2FA — públicas (temp_token, sin sesión completa) ──
  { path: 'auth/2fa',                component: TwoFactorComponent },
  { path: 'auth/2fa/reset',          component: TfaResetConfirmComponent },

  // ── Rutas de pago (Stripe redirige aquí) ───────────────────
  { path: 'payment/success',         component: PagoExitosoComponent },
  { path: 'payment/cancel',          component: PagoCanceladoComponent },

  // ── Pricing — público (cualquiera puede ver los planes) ────
  { path: 'pricing',                 component: PricingComponent },

  // ── Rutas autenticadas ─────────────────────────────────────
  { path: 'album',      component: AlbumDigitalComponent, canActivate: [authGuard] },
  { path: 'dashboard',  component: HomeComponent,         canActivate: [authGuard] },
  { path: 'info-boda',  component: InfoBodaComponent,     canActivate: [authGuard] },
  { path: 'onboarding', component: OnboardingComponent,   canActivate: [authGuard] },
  { path: 'perfil',     component: PerfilUsuarioComponent,canActivate: [authGuard] },
  { path: 'mis-bodas',  component: MisBodasComponent,     canActivate: [authGuard] },
  { path: 'perfil2fa',  component: Perfil2faComponent,    canActivate: [authGuard] },

  // ── Rutas con boda activa ──────────────────────────────────
  { path: 'diseno',    component: DisenoPapeleriaComponent, canActivate: [weddingOwnerGuard] },
  { path: 'checklist', component: ChecklistBodaComponent,   canActivate: [weddingOwnerGuard] },
  { path: 'invitados', component: ListaInvitadosComponent,  canActivate: [weddingOwnerGuard] },

  // ── Rutas con plan de pago ─────────────────────────────────
  {
    path: 'mesas',
    component: MesaManagerComponent,
    canActivate: [weddingOwnerGuard, PlanGuard],
    data: { planRequerido: 'one_time' },
  },
  {
    path: 'plano',
    component: PlanoInteractivoComponent,
    canActivate: [weddingOwnerGuard, PlanGuard],
    data: { planRequerido: 'one_time' },
  },

  // ── Fallback ───────────────────────────────────────────────
  // CRÍTICO: auth/2fa y auth/2fa/reset deben ir ANTES de este **
  { path: '**', redirectTo: 'home' },
];