import { Component, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IconComponent } from '../../shared/icons/icon.component';

type Step = 'loading' | 'success' | 'error';

@Component({
  selector: 'app-tfa-reset-confirm',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, IconComponent],
  template: `
<div class="reset-shell">
  <div class="reset-card">

    <!-- Cargando -->
    <ng-container *ngIf="step === 'loading'">
      <div class="reset-icon spin-icon"><app-icon name="relojCargando" [size]="65"></app-icon></div>
      <h1>{{ 'TFA.RESET_CONFIRM.LOADING_TITLE' | translate }}</h1>
      <p>{{ 'TFA.RESET_CONFIRM.LOADING_DESC' | translate }}</p>
    </ng-container>

    <!-- Éxito -->
    <ng-container *ngIf="step === 'success'">
      <div class="reset-icon"><app-icon name="aprobar" [size]="65"></app-icon></div>
      <h1>{{ 'TFA.RESET_CONFIRM.SUCCESS_TITLE' | translate }}</h1>
      <p [innerHTML]="'TFA.RESET_CONFIRM.SUCCESS_DESC' | translate"></p>
      <a routerLink="/login" class="btn-primary">{{ 'TFA.RESET_CONFIRM.GO_LOGIN' | translate }}</a>
    </ng-container>

    <!-- Error -->
    <ng-container *ngIf="step === 'error'">
      <div class="reset-icon"><app-icon name="rechazar" [size]="65"></app-icon></div>
      <h1>{{ 'TFA.RESET_CONFIRM.ERROR_TITLE' | translate }}</h1>
      <p>{{ errorMsg }}</p>
      <a routerLink="/login" class="btn-secondary">{{ 'TFA.RESET_CONFIRM.BACK_LOGIN' | translate }}</a>
    </ng-container>

  </div>
</div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=DM+Sans:wght@400;500&display=swap');

    .reset-shell {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: #faf8f5; font-family: 'DM Sans', sans-serif; padding: 24px;
    }
    .reset-card {
      background: white; border-radius: 20px; padding: 52px 44px;
      width: 100%; max-width: 420px; text-align: center;
      box-shadow: 0 4px 32px rgba(0,0,0,0.08); border: 1px solid #ede9e2;
    }
    .reset-icon { font-size: 3.5rem; display: block; margin-bottom: 20px; }
    .spin-icon  { animation: pulse 1.5s ease-in-out infinite; }
    @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.1); } }

    h1 {
      font-family: 'Cormorant Garamond', serif; font-size: 1.8rem;
      font-weight: 600; color: #1a1410; margin: 0 0 12px;
    }
    p { color: #7a6f65; font-size: 0.9rem; line-height: 1.7; margin: 0 0 28px; }

    .btn-primary {
      display: block; width: 100%; padding: 15px;
      background: linear-gradient(135deg, #606c38, #283618);
      color: white; border: none; border-radius: 12px; font-size: 1rem;
      font-weight: 600; font-family: 'DM Sans', sans-serif;
      text-decoration: none; text-align: center; transition: all .25s; box-sizing: border-box;
    }
    .btn-primary:hover { background: linear-gradient(135deg, #4f5a2e, #1e2812); transform: translateY(-1px); }

    .btn-secondary {
      display: block; width: 100%; padding: 14px; background: #f5f0e8;
      color: #606c38; border: 1.5px solid #d4c4a8; border-radius: 12px;
      font-size: .95rem; font-weight: 500; font-family: 'DM Sans', sans-serif;
      text-decoration: none; text-align: center; transition: all .2s; box-sizing: border-box;
    }
    .btn-secondary:hover { background: #ede5d5; border-color: #a08060; }
  `],
})
export class TfaResetConfirmComponent implements OnInit {
  step:     Step   = 'loading';
  errorMsg: string = 'El enlace puede haber expirado (válido 30 min) o ya fue usado. Solicita uno nuevo desde la pantalla de verificación.';

  private apiUrl = 'https://weddly-api-production.up.railway.app/api';

  constructor(
    private route:  ActivatedRoute,
    private router: Router,
    private http:   HttpClient,
    private translate: TranslateService,
  ) {}

  ngOnInit() {
    this.errorMsg = this.translate.instant('TFA.RESET_CONFIRM.ERROR_DEFAULT');
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';

    if (!token) {
      this.step = 'error';
      return;
    }

    this.http.post<any>(`${this.apiUrl}/auth/2fa/reset/confirm`, { reset_token: token })
      .subscribe({
        next:  () => { this.step = 'success'; },
        error: (err) => {
          this.step     = 'error';
          this.errorMsg = err?.error?.message || this.errorMsg;
        },
      });
  }
}