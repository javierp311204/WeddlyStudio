import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NotificationService } from '../../services/notification/notification.service';
import { IconComponent } from '../../shared/icons/icon.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule, TranslateModule, IconComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit {
  first_name: string = '';
  last_name:  string = '';
  email:      string = '';
  pass:       string = '';
  gender: string = '';
  language: string = 'es';
  nickname: string = '';
  phone: string = '';
  mostrarPassword: boolean = false;

  codigoBodaReferencia: string = '';
  private redirectUrl: string  = '';   // ← para saber a dónde ir tras registro

  private API_URL = 'https://weddly-api-production.up.railway.app/api/auth';

  constructor(
    private http:         HttpClient,
    private router:       Router,
    private route:        ActivatedRoute,
    private notifService: NotificationService,
    private translate:    TranslateService,
  ) {}

  ngOnInit(): void {
    const codigo = this.route.snapshot.queryParamMap.get('codigo');
    if (codigo) this.codigoBodaReferencia = codigo.toUpperCase();

    // Guardar redirect si viene de una invitación
    this.redirectUrl = this.route.snapshot.queryParamMap.get('redirect') ?? '';
  }

  togglePassword() {
    this.mostrarPassword = !this.mostrarPassword;
  }

  registrar() {
    const emailPattern = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$/;

    if (!emailPattern.test(this.email.toLowerCase())) {
      this.notifService.showError(
        this.translate.instant('AUTH.INVALID_EMAIL_TITLE'),
        this.translate.instant('AUTH.INVALID_EMAIL_DESC')
      );
      return;
    }

    if (!this.email || !this.pass || !this.first_name) {
      this.notifService.showError(
        this.translate.instant('AUTH.INCOMPLETE_FIELDS_TITLE'),
        this.translate.instant('AUTH.INCOMPLETE_FIELDS_DESC')
      );
      return;
    }

    const datos = {
      first_name: this.first_name.trim(),
      last_name:  this.last_name.trim() || undefined,
      email:      this.email.toLowerCase(),
      password:   this.pass,
      nickname:   this.nickname.trim() || undefined,
      phone:      this.phone.trim() || undefined,
      gender:     this.gender || undefined,
      language:   this.language || 'es',
    };

    this.http.post<any>(`${this.API_URL}/register`, datos).subscribe({
      next: (res) => {
        if (res.access_token) {
          localStorage.setItem('token', res.access_token);
          localStorage.setItem('refresh_token', res.refresh_token ?? '');
          const user = res.user ?? {};
          localStorage.setItem('usuarioNick', user.nickname || user.first_name || this.first_name);
          localStorage.setItem('rol', user.globalRole ?? 'user');
        }

        this.notifService.showSuccess(
          this.translate.instant('AUTH.ACCOUNT_CREATED_TITLE'),
          this.translate.instant('AUTH.ACCOUNT_CREATED_DESC', { email: this.email })
        );

        // ─── Redirect tras registro ───────────────────────────
        setTimeout(() => {
          this.router.navigateByUrl(this.redirectUrl || '/home');
        }, 1500);
      },
      error: (err) => {
        const mensaje = err.error?.message || err.error?.error || this.translate.instant('NOTIFICATIONS.ERROR_SAVING');
        this.notifService.showError(
          this.translate.instant('AUTH.REGISTER_ERROR_TITLE'),
          mensaje
        );
      }
    });
  }
}