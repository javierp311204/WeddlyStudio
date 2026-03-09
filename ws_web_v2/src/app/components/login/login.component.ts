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

    this.authService.login(this.email, this.pass).subscribe({
      next: (rawRes) => {
        // Cast a any para evitar conflictos con la unión de tipos
        // El backend siempre envuelve en { success, data: { ... } }
        const res = rawRes as any;

        const requires2fa = res.data?.requires_2fa ?? res.requires_2fa ?? false;

        if (requires2fa) {
          const tempToken = res.data?.temp_token ?? res.temp_token ?? '';
          this.router.navigate(['/auth/2fa'], {
            queryParams: { t: tempToken, email: this.email },
          });
          return;
        }

        // Login normal
        const user = res.data?.user;

        this.notifService.showSuccess(
          this.translate.instant('AUTH.LOGIN_SUCCESS_TITLE'),
          this.translate.instant('AUTH.LOGIN_SUCCESS_DESC', {
            nick: user?.first_name || this.translate.instant('AUTH.GUEST'),
          }),
        );

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
    this.router.navigate(['/reco-pass']);
  }

  irAlHome() {
    this.router.navigate(['/']);
  }
}