import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NotificationService } from '../../services/notification/notification.service';
import { IconComponent } from '../../shared/icons/icon.component';
import { environment } from '../../../environments/environment';
import { SeoService } from '../../services/seo/seo.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule, IconComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit {
  first_name: string = '';
  last_name:  string = '';
  email:      string = '';
  pass:       string = '';
  gender:     string = '';
  language:   string = 'es';
  nickname:   string = '';
  phone:      string = '';
  mostrarPassword: boolean = false;
  termsAccepted:   boolean = false;

  codigoBodaReferencia: string = '';
  private redirectUrl:  string = '';

  private API_URL    = environment.apiUrl + '/auth';
  private SOCIAL_URL = environment.apiUrl + '/auth/social';

  constructor(
    private http:         HttpClient,
    private router:       Router,
    private route:        ActivatedRoute,
    private notifService: NotificationService,
    private translate:    TranslateService,
    private seo:          SeoService,
  ) {}

  ngOnInit(): void {
    this.seo.set({
      title: 'Crear Cuenta Gratis | Weddly Studio — Organiza tu Boda',
      description: 'Crea tu cuenta gratuita en Weddly Studio y empieza a organizar tu boda hoy mismo. Sin tarjeta de crédito. El wedding planner digital más completo.',
      url: 'https://weddlystudio.uk/register',
    });

    const codigo = this.route.snapshot.queryParamMap.get('codigo');
    if (codigo) this.codigoBodaReferencia = codigo.toUpperCase();
    this.redirectUrl = this.route.snapshot.queryParamMap.get('redirect') ?? '';
  }

  togglePassword(): void {
    this.mostrarPassword = !this.mostrarPassword;
  }

  registrarConGoogle(): void {
    const redirect = encodeURIComponent(this.redirectUrl || '/home');
    const codigo   = encodeURIComponent(this.codigoBodaReferencia);
    window.location.href = `${this.SOCIAL_URL}/google?redirect=${redirect}&codigo=${codigo}`;
  }

  registrarConFacebook(): void {
    const redirect = encodeURIComponent(this.redirectUrl || '/home');
    const codigo   = encodeURIComponent(this.codigoBodaReferencia);
    window.location.href = `${this.SOCIAL_URL}/facebook?redirect=${redirect}&codigo=${codigo}`;
  }

  registrar(): void {
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

    if (!this.termsAccepted) {
      this.notifService.showError(
        this.translate.instant('AUTH.TERMS_REQUIRED_TITLE'),
        this.translate.instant('AUTH.TERMS_REQUIRED_DESC')
      );
      return;
    }

    const datos = {
      first_name: this.first_name.trim(),
      last_name:  this.last_name.trim()  || undefined,
      email:      this.email.toLowerCase(),
      password:   this.pass,
      nickname:   this.nickname.trim()   || undefined,
      phone:      this.phone.trim()      || undefined,
      gender:     this.gender            || undefined,
      language:   this.language          || 'es',
    };

    this.http.post<any>(`${this.API_URL}/register`, datos).subscribe({
      next: (res) => {
        if (res.access_token) {
          localStorage.setItem('token',         res.access_token);
          localStorage.setItem('refresh_token', res.refresh_token ?? '');
          const user = res.user ?? {};
          localStorage.setItem('usuarioNick', user.nickname || user.first_name || this.first_name);
          localStorage.setItem('rol',         user.globalRole ?? 'user');
        }

        this.notifService.showSuccess(
          this.translate.instant('AUTH.ACCOUNT_CREATED_TITLE'),
          this.translate.instant('AUTH.ACCOUNT_CREATED_DESC', { email: this.email })
        );

        setTimeout(() => {
          this.router.navigateByUrl(this.redirectUrl || '/home');
        }, 1500);
      },
      error: (err) => {
        const mensaje = err.error?.message || err.error?.error
          || this.translate.instant('NOTIFICATIONS.ERROR_SAVING');
        this.notifService.showError(
          this.translate.instant('AUTH.REGISTER_ERROR_TITLE'),
          mensaje
        );
      }
    });
  }
}