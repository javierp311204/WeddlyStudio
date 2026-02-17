import { Routes } from '@angular/router';
import { AlbumDigitalComponent } from './components/album-digital/album-digital.component';
import { DisenoPapeleriaComponent } from './components/diseno-papeleria/diseno-papeleria.component';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { MesaManagerComponent } from './components/mesa-manager/mesa-manager.component';
import { authGuard, adminGuard } from './guards/auth.guard';
import { RegisterComponent } from './components/register/register.component';
import { InfoBodaComponent } from './components/info-boda/info-boda.component';
import { ListaInvitadosComponent } from './components/lista-invitados/lista-invitados.component';
import { PlanoInteractivoComponent } from './components/plano-interactivo/plano-interactivo.component';
import { VerificarEmailComponent } from './pages/verificar-email/verificar-email.component';
import { ResetearPasswordComponent } from './pages/resetear-password/resetear-password.component';
import { RecuperarPasswordComponent } from './pages/recuperar-password/recuperar-password.component';
import { PricingComponent } from './pages/pricing/pricing.component';
import { PagoExitosoComponent } from './pages/pago-exitoso/pago-exitoso.component';
import { PlanGuard } from './guards/plan.guard';
import { ChecklistBodaComponent } from './components/checklist-boda/checklist-boda.component';

export const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent},
  { path: 'verificar-email', component: VerificarEmailComponent },
  { path: 'recuperar-password', component: RecuperarPasswordComponent },
  { path: 'resetear-password', component: ResetearPasswordComponent },
  { path: 'pricing', component: PricingComponent },
  { path: 'pago-exitoso', component: PagoExitosoComponent },

  { path: 'album', component: AlbumDigitalComponent, canActivate: [authGuard] },
  { path: 'dashboard', component: HomeComponent, canActivate: [authGuard] },
  { path: 'info-boda', component: InfoBodaComponent, canActivate: [authGuard] },
  { path: 'diseno', component: DisenoPapeleriaComponent, canActivate: [adminGuard]},
  { path: 'checklist', component: ChecklistBodaComponent, canActivate: [adminGuard] },
  
  { path: 'mesas', component: MesaManagerComponent, canActivate: [adminGuard, PlanGuard], data: { planRequerido: 'one_time' } },
  // { path: 'diseno', component: DisenoPapeleriaComponent, canActivate: [adminGuard, PlanGuard], data: { planRequerido: 'one_time' } },
  { path: 'plano', component: PlanoInteractivoComponent, canActivate: [adminGuard, PlanGuard], data: { planRequerido: 'one_time' } },

  { path: 'pricing', component: PricingComponent, canActivate: [adminGuard] },
  { path: 'pago-exitoso', component: PagoExitosoComponent, canActivate: [adminGuard]},
  { path: 'invitados', component: ListaInvitadosComponent, canActivate: [adminGuard] },
  
  
  
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', redirectTo: 'home' }
];