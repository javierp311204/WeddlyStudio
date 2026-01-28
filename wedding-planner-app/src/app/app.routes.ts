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

export const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent},

  { path: 'album', component: AlbumDigitalComponent, canActivate: [authGuard] },
  { path: 'dashboard', component: HomeComponent, canActivate: [authGuard] },
  { path: 'info-boda', component: InfoBodaComponent, canActivate: [authGuard] },
  
  { path: 'mesas', component: MesaManagerComponent, canActivate: [adminGuard] },
  { path: 'diseno', component: DisenoPapeleriaComponent, canActivate: [adminGuard] },
  { path: 'invitados', component: ListaInvitadosComponent, canActivate: [adminGuard] },
  
  { path: '', redirectTo: 'home', pathMatch: 'full' }
];