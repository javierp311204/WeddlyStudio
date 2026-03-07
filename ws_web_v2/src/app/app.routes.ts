import { Routes } from '@angular/router';
import { AlbumDigitalComponent } from './components/album-digital/album-digital.component';
import { DisenoPapeleriaComponent } from './components/diseno-papeleria/diseno-papeleria.component';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { MesaManagerComponent } from './components/mesa-manager/mesa-manager.component';
import { authGuard, adminGuard, weddingOwnerGuard } from './guards/auth.guard';
import { RegisterComponent } from './components/register/register.component';
import { InfoBodaComponent } from './components/info-boda/info-boda.component';
import { ListaInvitadosComponent } from './components/lista-invitados/lista-invitados.component';
import { PlanoInteractivoComponent } from './components/plano-interactivo/plano-interactivo.component';
import { ChecklistBodaComponent } from './components/checklist-boda/checklist-boda.component';
import { PlanGuard } from './guards/plan.guard';
import { VerificarEmailComponent } from './pages/verificar-email/verificar-email.component';
import { OnboardingComponent } from './components/onboarding/onboarding.component';
import { RsvpComponent } from './components/rsvp/rsvp.component';
import { PricingComponent } from './pages/pricing/pricing.component';

export const routes: Routes = [

  // ── Rutas públicas ──────────────────────────────────────────
  { path: '',                        redirectTo: 'home', pathMatch: 'full' },
  { path: 'home',                    component: HomeComponent },
  { path: 'login',                   component: LoginComponent },
  { path: 'register',                component: RegisterComponent },
  { path: 'verify-email/:token',     component: VerificarEmailComponent },
  { path: 'rsvp/:code',              component: RsvpComponent },

  // ── Rutas autenticadas (cualquier usuario logueado) ─────────
  { path: 'album',      component: AlbumDigitalComponent, canActivate: [authGuard] },
  { path: 'dashboard',  component: HomeComponent,         canActivate: [authGuard] },
  { path: 'info-boda',  component: InfoBodaComponent,     canActivate: [authGuard] },
  { path: 'onboarding', component: OnboardingComponent, canActivate: [authGuard] },

  // ── Rutas solo admin ────────────────────────────────────────
  { path: 'diseno',    component: DisenoPapeleriaComponent, canActivate: [weddingOwnerGuard] },
  { path: 'checklist', component: ChecklistBodaComponent,   canActivate: [weddingOwnerGuard] },
  { path: 'invitados', component: ListaInvitadosComponent,  canActivate: [weddingOwnerGuard] },
  { path: 'pricing', component: PricingComponent,  canActivate: [weddingOwnerGuard] },

  // ── Rutas admin + plan de pago ──────────────────────────────
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

  // ── Fallback ────────────────────────────────────────────────
  { path: '**', redirectTo: 'home' },
];