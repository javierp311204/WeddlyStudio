import { Component, OnInit } from '@angular/core'; // ← OnInit AÑADIDO
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NotificationService } from '../../services/notification/notification.service';
import { AuthService } from '../../services/auth/auth.service';
import { IconComponent } from '../../shared/icons/icon.component';
import { SeoService } from '../../services/seo/seo.service'; // ← AÑADIDO

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule, IconComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit { // ← OnInit AÑADIDO
  email:           string  = '';
  pass:            string  = '';
  mostrarPassword: boolean = false;

  constructor(
    private authService:  AuthService,
    private router:       Router,
    private route:        ActivatedRoute,
    private notifService: NotificationService,
    private translate:    TranslateService,
    private seo:          SeoService, // ← AÑADIDO
  ) {}

  // ── SEO ────────────────────────────────────────────────────── // ← AÑADIDO
  ngOnInit(): void {
    this.seo.set({
      title: 'Iniciar Sesión | Weddly Studio',
      description: 'Accede a tu cuenta de Weddly Studio y retoma la organización de tu boda.',
      url: 'https://weddlystudio.uk/login',
      noIndex: true,
    });
  }
  // ─────────────────────────────────────────────────────────────

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
        const res = rawRes as any;
        const requires2fa = res.data?.requires_2fa ?? res.requires_2fa ?? false;

        if (requires2fa) {
          const tempToken = res.data?.temp_token ?? res.temp_token ?? '';
          this.router.navigate(['/auth/2fa'], {
            queryParams: { t: tempToken, email: this.email },
          });
          return;
        }

        if (!res.success) {
          this.notifService.showError(
            this.translate.instant('AUTH.LOGIN_ERROR_TITLE'),
            'Login failed. Please try again.',
          );
          return;
        }

        const user = res.data?.user;
        this.notifService.showSuccess(
          this.translate.instant('AUTH.LOGIN_SUCCESS_TITLE'),
          this.translate.instant('AUTH.LOGIN_SUCCESS_DESC', {
            nick: user?.first_name || this.translate.instant('AUTH.GUEST'),
          }),
        );

        const redirect = this.route.snapshot.queryParamMap.get('redirect');
        this.router.navigateByUrl(redirect ?? '/dashboard');
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

  irARecuperarPassword() { this.router.navigate(['/reco-pass']); }
  irAlHome()             { this.router.navigate(['/']);          }
}