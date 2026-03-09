import { Component, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { FormsModule }       from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NotificationService } from '../../services/notification/notification.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

type Step = 'loading' | 'disabled' | 'setup_qr' | 'setup_verify' | 'enabled';

@Component({
  selector: 'app-perfil-2fa',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
<div class="tfa-card">

  <div class="tfa-header">
    <span class="tfa-header__icon">🔐</span>
    <div>
      <p class="tfa-header__title">{{ 'TFA.TITLE' | translate }}</p>
      <p class="tfa-header__desc">{{ 'TFA.DESCRIPTION' | translate }}</p>
    </div>
    <span class="tfa-badge" [class.tfa-badge--on]="step === 'enabled'" [class.tfa-badge--off]="step === 'disabled'">
      <ng-container *ngIf="step === 'loading'">{{ 'TFA.LOADING' | translate }}</ng-container>
      <ng-container *ngIf="step === 'enabled'">{{ 'TFA.STATUS_ACTIVE' | translate }}</ng-container>
      <ng-container *ngIf="step === 'disabled' || step === 'setup_qr' || step === 'setup_verify'">{{ 'TFA.STATUS_INACTIVE' | translate }}</ng-container>
    </span>
  </div>

  <!-- Loading -->
  <ng-container *ngIf="step === 'loading'">
    <p class="tfa-hint">{{ 'TFA.LOADING' | translate }}</p>
  </ng-container>

  <!-- 2FA desactivado -->
  <ng-container *ngIf="step === 'disabled'">
    <p class="tfa-hint">
      {{ 'TFA.DISABLED_DESCRIPTION' | translate }}
    </p>
    <button class="tfa-btn tfa-btn--primary" (click)="iniciarSetup()" [disabled]="loading">
      {{ loading ? ('TFA.GENERATING_QR' | translate) : ('TFA.ACTIVATE_BTN' | translate) }}
    </button>
  </ng-container>

  <!-- Paso 1: escanear QR -->
  <ng-container *ngIf="step === 'setup_qr'">
    <p class="tfa-hint">
      {{ 'TFA.SCAN_QR_TITLE' | translate }}<br>
      {{ 'TFA.SCAN_QR_DESC' | translate }}
    </p>

    <div class="tfa-qr-wrap">
      <img [src]="qrDataUrl" alt="QR 2FA" class="tfa-qr" />
    </div>

    <div class="tfa-secret-row">
      <span class="tfa-secret-label">{{ 'TFA.MANUAL_CODE_LABEL' | translate }}</span>
      <code class="tfa-secret">{{ secret }}</code>
      <button class="tfa-copy-btn" (click)="copiarSecret()" title="Copiar">📋</button>
    </div>

    <div class="tfa-actions">
      <button class="tfa-btn tfa-btn--primary" (click)="step = 'setup_verify'">
        {{ 'TFA.SCANNED_BTN' | translate }}
      </button>
      <button class="tfa-btn tfa-btn--ghost" (click)="cancelar()">{{ 'TFA.CANCEL_BTN' | translate }}</button>
    </div>
  </ng-container>

  <!-- Paso 2: verificar código -->
  <ng-container *ngIf="step === 'setup_verify'">
    <p class="tfa-hint">
      {{ 'TFA.ENTER_CODE_TITLE' | translate }}
    </p>

    <div class="tfa-code-row">
      <input
        class="tfa-code-input"
        type="text"
        inputmode="numeric"
        maxlength="6"
        placeholder="{{ 'TFA.CODE_PLACEHOLDER' | translate }}"
        [(ngModel)]="verifyCode"
        (keydown.enter)="confirmarSetup()"
        autofocus
      />
      <button class="tfa-btn tfa-btn--primary" (click)="confirmarSetup()" [disabled]="loading || verifyCode.length < 6">
        {{ loading ? ('TFA.VERIFYING' | translate) : ('TFA.CONFIRM_BTN' | translate) }}
      </button>
    </div>

    <p class="tfa-error" *ngIf="errorMsg">{{ errorMsg }}</p>

    <div class="tfa-actions">
      <button class="tfa-btn tfa-btn--ghost" (click)="step = 'setup_qr'">{{ 'TFA.BACK_TO_QR' | translate }}</button>
      <button class="tfa-btn tfa-btn--ghost" (click)="cancelar()">{{ 'TFA.CANCEL_BTN' | translate }}</button>
    </div>
  </ng-container>

  <!-- 2FA activado -->
  <ng-container *ngIf="step === 'enabled'">
    <p class="tfa-hint">
      {{ 'TFA.ACCOUNT_PROTECTED' | translate }}<br>
      {{ 'TFA.ACCOUNT_PROTECTED_DESC' | translate }}
    </p>

    <ng-container *ngIf="!showDisableForm">
      <button class="tfa-btn tfa-btn--danger" (click)="showDisableForm = true">
        {{ 'TFA.DISABLE_BTN' | translate }}
      </button>
    </ng-container>

    <ng-container *ngIf="showDisableForm">
      <p class="tfa-hint tfa-hint--warn">
        {{ 'TFA.DISABLE_WARNING' | translate }}
      </p>
      <div class="tfa-code-row">
        <input
          class="tfa-code-input tfa-code-input--wide"
          type="password"
          placeholder="{{ 'TFA.CURRENT_PASSWORD_PLACEHOLDER' | translate }}"
          [(ngModel)]="disablePassword"
          (keydown.enter)="desactivar()"
        />
        <button class="tfa-btn tfa-btn--danger" (click)="desactivar()" [disabled]="loading || !disablePassword">
          {{ loading ? ('TFA.DISABLING' | translate) : ('TFA.CONFIRM_DISABLE_BTN' | translate) }}
        </button>
      </div>
      <p class="tfa-error" *ngIf="errorMsg">{{ errorMsg }}</p>
      <button class="tfa-btn tfa-btn--ghost" (click)="showDisableForm = false; errorMsg = ''">
        {{ 'TFA.CANCEL_BTN' | translate }}
      </button>
    </ng-container>
  </ng-container>

</div>
  `,
  styles: [`
    .tfa-card {
      background: #faf8f5;
      border: 1px solid #e8e2d9;
      border-radius: 14px;
      padding: 24px;
      margin-top: 16px;
    }

    .tfa-header {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      margin-bottom: 18px;
    }
    .tfa-header__icon { font-size: 1.5rem; flex-shrink: 0; margin-top: 2px; }
    .tfa-header__title {
      font-weight: 600; font-size: 0.95rem; color: #1a1410; margin: 0 0 3px;
    }
    .tfa-header__desc { font-size: 0.82rem; color: #9a8f85; margin: 0; }

    .tfa-badge {
      margin-left: auto; flex-shrink: 0;
      font-size: 0.78rem; font-weight: 600;
      padding: 4px 12px; border-radius: 20px;
    }
    .tfa-badge--on  { background: #e8f5e9; color: #2e7d32; }
    .tfa-badge--off { background: #fce4ec; color: #c62828; }

    .tfa-hint {
      font-size: 0.87rem; color: #6b6059; line-height: 1.6;
      margin: 0 0 16px;
    }
    .tfa-hint--warn { color: #b45309; }

    .tfa-qr-wrap {
      display: flex; justify-content: center; margin: 16px 0;
    }
    .tfa-qr {
      width: 180px; height: 180px;
      border: 3px solid #e8e2d9; border-radius: 12px;
      image-rendering: pixelated;
    }

    .tfa-secret-row {
      display: flex; align-items: center; gap: 8px;
      background: white; border: 1px solid #e8e2d9;
      border-radius: 8px; padding: 10px 14px; margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .tfa-secret-label { font-size: 0.8rem; color: #9a8f85; }
    .tfa-secret {
      font-family: monospace; font-size: 0.85rem;
      color: #1a1410; letter-spacing: 1px; flex: 1;
    }
    .tfa-copy-btn {
      background: none; border: none; cursor: pointer; font-size: 1rem; padding: 0;
    }

    .tfa-code-row {
      display: flex; gap: 10px; align-items: center; margin-bottom: 12px;
    }
    .tfa-code-input {
      width: 130px; padding: 10px 14px;
      border: 2px solid #e5e0d8; border-radius: 10px;
      font-size: 1.2rem; text-align: center; letter-spacing: 4px;
      font-family: monospace; outline: none;
      transition: border-color 0.2s;
    }
    .tfa-code-input--wide {
      width: 220px; letter-spacing: normal;
      font-size: 0.95rem; text-align: left;
    }
    .tfa-code-input:focus { border-color: #606c38; }

    .tfa-error {
      color: #c0392b; font-size: 0.83rem;
      background: #fff5f5; border: 1px solid #fcd4d4;
      border-radius: 8px; padding: 8px 12px; margin-bottom: 12px;
    }

    .tfa-actions {
      display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;
    }

    .tfa-btn {
      padding: 9px 20px; border-radius: 10px; font-size: 0.88rem;
      font-weight: 500; cursor: pointer; border: none; transition: all 0.2s;
      font-family: inherit;
    }
    .tfa-btn--primary {
      background: linear-gradient(135deg, #606c38, #283618);
      color: white;
    }
    .tfa-btn--primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #4f5a2e, #1e2812);
      transform: translateY(-1px);
    }
    .tfa-btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .tfa-btn--danger { background: #c0392b; color: white; }
    .tfa-btn--danger:hover:not(:disabled) { background: #a93226; }
    .tfa-btn--danger:disabled { opacity: 0.6; cursor: not-allowed; }
    .tfa-btn--ghost {
      background: white; color: #606c38;
      border: 1.5px solid #d4c4a8;
    }
    .tfa-btn--ghost:hover { background: #f5f0e8; }
  `],
})
export class Perfil2faComponent implements OnInit {

  step:            Step    = 'loading';
  loading          = false;
  errorMsg         = '';
  qrDataUrl        = '';
  secret           = '';
  verifyCode       = '';
  showDisableForm  = false;
  disablePassword  = '';

  private apiUrl = 'http://localhost:3000/api';

  constructor(
    private http:  HttpClient,
    private notif: NotificationService,
    private translate: TranslateService,
  ) {}

  ngOnInit() {
    this.cargarEstado();
  }

  private getHeaders() {
    const token = localStorage.getItem('token');
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  cargarEstado() {
    this.http.get<any>(`${this.apiUrl}/auth/2fa/status`, this.getHeaders()).subscribe({
      next:  (res) => { this.step = res.data?.enabled ? 'enabled' : 'disabled'; },
      error: ()    => { this.step = 'disabled'; },
    });
  }

  iniciarSetup() {
    this.loading = true;
    this.http.post<any>(`${this.apiUrl}/auth/2fa/setup`, {}, this.getHeaders()).subscribe({
      next: (res) => {
        this.loading    = false;
        this.qrDataUrl  = res.data?.qr_data_url  ?? '';
        this.secret     = res.data?.otpauth_url?.match(/secret=([^&]+)/)?.[1] ?? '';
        this.step       = 'setup_qr';
      },
      error: (err) => {
        this.loading  = false;
        this.notif.showError(this.translate.instant('COMMON.ERROR'), this.translate.instant('TFA.ERROR_QR_GENERATION'));
      },
    });
  }

  confirmarSetup() {
    if (this.verifyCode.length < 6 || this.loading) return;
    this.loading  = true;
    this.errorMsg = '';

    this.http.post<any>(
      `${this.apiUrl}/auth/2fa/setup/verify`,
      { token: this.verifyCode },
      this.getHeaders(),
    ).subscribe({
      next: () => {
        this.loading     = false;
        this.step        = 'enabled';
        this.verifyCode  = '';
        this.notif.showSuccess(this.translate.instant('TFA.SUCCESS_ACTIVATED'), this.translate.instant('TFA.SUCCESS_ACTIVATED_DESC'));
      },
      error: (err) => {
        this.loading  = false;
        this.errorMsg = err?.error?.message || this.translate.instant('TFA.ERROR_CODE_INVALID');
        this.verifyCode = '';
      },
    });
  }

  desactivar() {
    if (!this.disablePassword || this.loading) return;
    this.loading  = true;
    this.errorMsg = '';

    this.http.delete<any>(`${this.apiUrl}/auth/2fa`, {
      ...this.getHeaders(),
      body: { password: this.disablePassword },
    }).subscribe({
      next: () => {
        this.loading         = false;
        this.step            = 'disabled';
        this.showDisableForm = false;
        this.disablePassword = '';
        this.notif.showSuccess(this.translate.instant('TFA.SUCCESS_DISABLED'), this.translate.instant('TFA.SUCCESS_DISABLED_DESC'));
      },
      error: (err) => {
        this.loading  = false;
        this.errorMsg = err?.error?.message || this.translate.instant('TFA.ERROR_PASSWORD_INVALID');
      },
    });
  }

  cancelar() {
    this.step       = 'disabled';
    this.verifyCode = '';
    this.errorMsg   = '';
    this.qrDataUrl  = '';
    this.secret     = '';
  }

  copiarSecret() {
    navigator.clipboard.writeText(this.secret).then(() => {
      this.notif.showSuccess(this.translate.instant('TFA.SUCCESS_COPIED'), this.translate.instant('TFA.SUCCESS_COPIED_DESC'));
    });
  }
}