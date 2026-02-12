import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NotificationService } from '../../services/notification/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule, TranslateModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  email: string = '';
  pass: string = '';
  mostrarPassword: boolean = false;

  private API_URL = 'http://localhost:3000/api/auth/login';

  constructor(
    private http: HttpClient,
    private router: Router,
    private notifService: NotificationService,
    private translate: TranslateService
  ) {}

  togglePassword() {
    this.mostrarPassword = !this.mostrarPassword;
  }

  login() {
    if (!this.email || !this.pass) {
      this.notifService.showError(
        this.translate.instant('AUTH.INCOMPLETE_FIELDS_TITLE'),
        this.translate.instant('AUTH.LOGIN_MISSING_CREDENTIALS')
      );
      return;
    }

    const credenciales = {
      email: this.email,
      pass: this.pass,
    };

    this.http.post<any>(this.API_URL, credenciales).subscribe({
      next: (res) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('rol', res.rol);
        localStorage.setItem('codigoBoda', res.codigoBoda);
        localStorage.setItem('usuarioEmail', res.email);
        localStorage.setItem('usuarioNick', res.nick);
        localStorage.setItem('tipoUsuario', res.tipoUsuario || 'invitado');

        this.notifService.showSuccess(
          this.translate.instant('AUTH.LOGIN_SUCCESS_TITLE'),
          this.translate.instant('AUTH.LOGIN_SUCCESS_DESC', { nick: res.nick || this.translate.instant('AUTH.GUEST') })
        );

        this.router.navigate(['/home']);
      },
      error: (err) => {
        if (err.status === 403 && err.error?.emailNoVerificado) {
          this.notifService.showError(
            this.translate.instant('AUTH.EMAIL_NOT_VERIFIED_TITLE'),
            this.translate.instant('AUTH.EMAIL_NOT_VERIFIED_DESC')
          );
        } else {
          const mensaje = err.error?.mensaje || this.translate.instant('AUTH.LOGIN_INVALID_CREDENTIALS');
          this.notifService.showError(
            this.translate.instant('AUTH.LOGIN_ERROR_TITLE'),
            mensaje
          );
        }
        console.error('Error en login:', err);
      },
    });
  }

  irARecuperarPassword() {
    this.router.navigate(['/recuperar-password']);
  }

  irAlHome() {
    this.router.navigate(['/home']);
  }
}