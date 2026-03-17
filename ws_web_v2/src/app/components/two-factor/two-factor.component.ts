import { Component, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { FormsModule }       from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient }        from '@angular/common/http';
import { AuthService }       from '../../services/auth/auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IconComponent } from '../../shared/icons/icon.component';

type Step = 'code' | 'reset_sent';

@Component({
  selector: 'app-two-factor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule, IconComponent],
  template: `
<div class="tfa-shell">
  <div class="tfa-card">

    <div class="tfa-header">
      <span class="tfa-emoji"> <app-icon name="aprobar" [size]="50"></app-icon> </span>
        <h1>{{ 'TFA.VERIFY.TITLE' | translate }}</h1>
        <p>{{ 'TFA.VERIFY.SUBTITLE' | translate }}</p>
    </div>

    <!-- Introducir código -->
    <ng-container *ngIf="step === 'code'">
      <div class="code-inputs">
        <input
          *ngFor="let i of [0,1,2,3,4,5]"
          type="text"
          maxlength="1"
          inputmode="numeric"
          [(ngModel)]="digits[i]"
          (input)="onInput($event, i)"
          (keydown)="onKey($event, i)"
          [id]="'d' + i"
          class="digit"
        />
      </div>

      <p class="error-msg" *ngIf="errorMsg">{{ errorMsg }}</p>

      <button class="btn-primary" (click)="verify()" [disabled]="loading || getCode().length < 6">
        <span *ngIf="!loading">{{ 'TFA.VERIFY.BTN_VERIFY' | translate }}</span>
        <span *ngIf="loading" class="spin"></span>
      </button>

      <div class="recovery-row">
        <span>{{ 'TFA.VERIFY.LOST_APP' | translate }}</span>
        <button class="btn-link" (click)="requestReset()" [disabled]="resetLoading">
          {{ resetLoading ? ('TFA.VERIFY.SENDING' | translate) : ('TFA.VERIFY.RECOVER_EMAIL' | translate) }}
        </button>
      </div>
    </ng-container>

    <!-- Email enviado -->
    <ng-container *ngIf="step === 'reset_sent'">
      <div class="info-box">
        <span class="big-emoji"><app-icon name="invitacion" [size]="50"></app-icon></span>
        <p>{{ 'TFA.VERIFY.RESET_SENT_DESC' | translate }}</p>
      </div>
      <a routerLink="/login" class="btn-secondary">{{ 'TFA.VERIFY.BACK_LOGIN' | translate }}</a>
    </ng-container>

  </div>
</div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=DM+Sans:wght@400;500&display=swap');

    .tfa-shell {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: #faf8f5; font-family: 'DM Sans', sans-serif; padding: 24px;
    }
    .tfa-card {
      background: white; border-radius: 20px; padding: 52px 44px;
      width: 100%; max-width: 420px; text-align: center;
      box-shadow: 0 4px 32px rgba(0,0,0,0.08); border: 1px solid #ede9e2;
    }
    .tfa-header { margin-bottom: 36px; }
    .tfa-emoji  { font-size: 3rem; display: block; margin-bottom: 16px; }
    h1 {
      font-family: 'Cormorant Garamond', serif; font-size: 1.8rem;
      font-weight: 600; color: #1a1410; margin: 0 0 8px;
    }
    p { margin: 0; color: #7a6f65; font-size: 0.9rem; line-height: 1.6; }

    .code-inputs { display: flex; gap: 10px; justify-content: center; margin-bottom: 24px; }
    .digit {
      width: 48px; height: 58px; border: 2px solid #e5e0d8; border-radius: 12px;
      font-size: 1.6rem; font-weight: 600; text-align: center; color: #1a1410;
      background: #faf8f5; outline: none; font-family: 'DM Sans', sans-serif;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .digit:focus { border-color: #606c38; box-shadow: 0 0 0 3px rgba(96,108,56,.1); background: white; }

    .error-msg {
      color: #c0392b; font-size: .85rem; background: #fff5f5;
      border: 1px solid #fcd4d4; border-radius: 8px; padding: 10px 14px; margin-bottom: 18px;
    }

    .btn-primary {
      width: 100%; padding: 15px; background: linear-gradient(135deg, #606c38, #283618);
      color: white; border: none; border-radius: 12px; font-size: 1rem; font-weight: 600;
      font-family: 'DM Sans', sans-serif; cursor: pointer; transition: all .25s;
      display: flex; align-items: center; justify-content: center; min-height: 50px;
    }
    .btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #4f5a2e, #1e2812);
      box-shadow: 0 6px 20px rgba(96,108,56,.3); transform: translateY(-1px);
    }
    .btn-primary:disabled { opacity: .6; cursor: not-allowed; transform: none; }

    .recovery-row {
      margin-top: 20px; font-size: .85rem; color: #9a8f85;
      display: flex; align-items: center; justify-content: center; gap: 6px; flex-wrap: wrap;
    }
    .btn-link {
      background: none; border: none; color: #606c38; cursor: pointer;
      font-size: .85rem; font-family: 'DM Sans', sans-serif; text-decoration: underline; padding: 0;
    }
    .btn-link:disabled { opacity: .6; cursor: not-allowed; }

    .spin {
      display: inline-block; width: 18px; height: 18px;
      border: 2px solid rgba(255,255,255,.3); border-top-color: white;
      border-radius: 50%; animation: spin .7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .info-box {
      background: #f0fff4; border: 1px solid #c3e6cb; border-radius: 12px;
      padding: 24px; margin-bottom: 24px;
    }
    .big-emoji { font-size: 2.5rem; display: block; text-align: center; margin-bottom: 12px; }

    .btn-secondary {
      display: block; width: 100%; padding: 14px; background: #f5f0e8;
      color: #606c38; border: 1.5px solid #d4c4a8; border-radius: 12px;
      font-size: .95rem; font-weight: 500; font-family: 'DM Sans', sans-serif;
      text-decoration: none; text-align: center; transition: all .2s; box-sizing: border-box;
    }
    .btn-secondary:hover { background: #ede5d5; border-color: #a08060; }

    @media (max-width: 480px) {
      .tfa-card { padding: 36px 20px; }
      .digit { width: 42px; height: 52px; font-size: 1.4rem; }
    }
  `],
})
export class TwoFactorComponent implements OnInit {
  step:        Step     = 'code';
  digits:      string[] = ['','','','','',''];
  loading      = false;
  resetLoading = false;
  errorMsg     = '';
  tempToken    = '';
  userEmail    = '';

  private apiUrl = 'https://weddly-api-production.up.railway.app/api';

  constructor(
    private route:       ActivatedRoute,
    private router:      Router,
    private http:        HttpClient,
    private authService: AuthService,
    private translate:   TranslateService,
  ) {}

  ngOnInit() {
    this.tempToken = this.route.snapshot.queryParamMap.get('t')     ?? '';
    this.userEmail = this.route.snapshot.queryParamMap.get('email') ?? '';
    if (!this.tempToken) this.router.navigate(['/login']);
    setTimeout(() => document.getElementById('d0')?.focus(), 100);
  }

  getCode(): string { return this.digits.join(''); }

  onInput(event: Event, i: number) {
    const el  = event.target as HTMLInputElement;
    const val = el.value.replace(/\D/g, '').slice(-1);
    this.digits[i] = val;
    this.errorMsg  = '';
    if (val && i < 5) document.getElementById(`d${i + 1}`)?.focus();
    if (this.getCode().length === 6) setTimeout(() => this.verify(), 80);
  }

  onKey(event: KeyboardEvent, i: number) {
    if (event.key === 'Backspace' && !this.digits[i] && i > 0) {
      document.getElementById(`d${i - 1}`)?.focus();
    }
  }

  verify() {
    const code = this.getCode();
    if (code.length < 6 || this.loading) return;
    this.loading = true; this.errorMsg = '';

    this.http.post<any>(`${this.apiUrl}/auth/2fa/verify`, {
      temp_token: this.tempToken, token: code,
    }).subscribe({
      next: (res) => {
        this.loading = false;
        const access  = res.data?.access_token  ?? res.access_token;
        const refresh = res.data?.refresh_token ?? res.refresh_token;

        if (access)  localStorage.setItem('token',         access);
        if (refresh) localStorage.setItem('refresh_token', refresh);

        // FIX: llamar getMe() y guardar firstName + otros datos en localStorage
        this.authService.getMe().subscribe({
          next: (meRes) => {
            const user = meRes?.data ?? meRes;
            if (user.first_name) localStorage.setItem('firstName',  user.first_name);
            if (user.last_name)  localStorage.setItem('lastName',   user.last_name);
            if (user.email)      localStorage.setItem('userEmail',  user.email);
            if (user.id)         localStorage.setItem('userId',     user.id);
            if (user.role_global)localStorage.setItem('rol',        user.role_global);
            if (user.avatar_url) {
              localStorage.setItem('avatarUrl', user.avatar_url);
              this.authService.updateAvatar(user.avatar_url);
            }
            // Guardar weddingId si tiene boda activa
            const roles = user.wedding_roles ?? [];
            if (roles.length > 0) {
              const weddingId = roles[0].wedding?.id ?? roles[0].wedding_id;
              const role      = roles[0].role ?? 'owner';
              if (weddingId) localStorage.setItem('weddingId',   weddingId);
              if (role)      localStorage.setItem('weddingRole', role);
            }
            this.router.navigate(['/dashboard']);
          },
          error: () => {
            // Si getMe() falla igualmente navegar al dashboard
            this.router.navigate(['/dashboard']);
          },
        });
      },
      error: (err) => {
        this.loading  = false;
        this.errorMsg = err?.error?.message || this.translate.instant('TFA.ERROR_CODE_INVALID');
        this.digits   = ['','','','','',''];
        setTimeout(() => document.getElementById('d0')?.focus(), 50);
      },
    });
  }

  requestReset() {
    if (!this.userEmail) return;
    this.resetLoading = true;
    this.http.post<any>(`${this.apiUrl}/auth/2fa/reset/request`, { email: this.userEmail })
      .subscribe({
        next:  () => { this.resetLoading = false; this.step = 'reset_sent'; },
        error: () => { this.resetLoading = false; this.step = 'reset_sent'; },
      });
  }
}