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

export const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent},
  { path: 'verificar-email', component: VerificarEmailComponent },
  { path: 'recuperar-password', component: RecuperarPasswordComponent },
  { path: 'resetear-password', component: ResetearPasswordComponent },

  { path: 'album', component: AlbumDigitalComponent, canActivate: [authGuard] },
  { path: 'dashboard', component: HomeComponent, canActivate: [authGuard] },
  { path: 'info-boda', component: InfoBodaComponent, canActivate: [authGuard] },
  
  { path: 'mesas', component: MesaManagerComponent, canActivate: [adminGuard] },
  { path: 'diseno', component: DisenoPapeleriaComponent, canActivate: [adminGuard] },
  { path: 'invitados', component: ListaInvitadosComponent, canActivate: [adminGuard] },
  { path: 'plano', component: PlanoInteractivoComponent, canActivate: [adminGuard] },
  
  
  { path: '', redirectTo: 'home', pathMatch: 'full' }
];