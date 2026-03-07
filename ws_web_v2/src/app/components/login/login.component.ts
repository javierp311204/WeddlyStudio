import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NotificationService } from '../../services/notification/notification.service';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  email:           string  = '';
  pass:            string  = '';
  mostrarPassword: boolean = false;

  constructor(
    private authService:  AuthService,
    private router:       Router,
    private notifService: NotificationService,
    private translate:    TranslateService,
  ) {}

  togglePassword() {
    this.mostrarPassword = !this.mostrarPassword;
  }

  login() {
    if (!this.email || !this.pass) {
      this.notifService.showError(
        this.translate.instant('AUTH.INCOMPLETE_FIELDS_TITLE'),
        this.translate.instant('AUTH.LOGIN_MISSING_CREDENTIALS'),
      );
      return;
    }

    // FIX: usar AuthService.login() en vez de HttpClient directo.
    // AuthService ya guarda el token correctamente leyendo res.data.access_token
    // y no hace el switchMap problemático que causaba el logout automático.
    this.authService.login(this.email, this.pass).subscribe({
      next: (res) => {
        const user = res.data.user;

        this.notifService.showSuccess(
          this.translate.instant('AUTH.LOGIN_SUCCESS_TITLE'),
          this.translate.instant('AUTH.LOGIN_SUCCESS_DESC', {
            nick: user.first_name || this.translate.instant('AUTH.GUEST'),
          }),
        );

        // HomeComponent se encarga de cargar el weddingId y redirigir
        // a /onboarding si el usuario no tiene boda todavía
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        const mensaje =
          err.error?.message ||
          err.error?.error ||
          this.translate.instant('AUTH.LOGIN_INVALID_CREDENTIALS');

        this.notifService.showError(
          this.translate.instant('AUTH.LOGIN_ERROR_TITLE'),
          mensaje,
        );
      },
    });
  }

  irARecuperarPassword() {
    this.router.navigate(['/recuperar-password']);
  }

  // FIX: navega a '/' (landing) en vez de '/home' para evitar el bucle
  // login → home → home detecta sin sesión → login → ...
  irAlHome() {
    this.router.navigate(['/']);
  }
}