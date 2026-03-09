: ¿Qué método de 2FA implementamos?
R: TOTP (Google Authenticator / Authy)

P: ¿Cómo manejamos la recuperación si el usuario pierde acceso?
R: Reset por email solamente

P: ¿Dónde mostramos el flujo de 2FA en login?
R: Página separada /auth/2fa

12:54 p.m.
Perfecto. Antes de escribir código necesito ver los archivos actuales para no pisar nada:

powershell
type src\schemas\auth.schema.ts
type src\utils\email.ts
type src\routes\auth.routes.ts
Y del frontend:

powershell
type src\app\components\login\login.component.ts
type src\app\app.routes.ts

import nodemailer from 'nodemailer'; const transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST || 'smtp.gmail.com', port: Number(process.env.SMTP_PORT) || 587, secure: false, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS, }, }); /

pasted


import { Routes } from '@angular/router'; import { AlbumDigitalComponent } from './components/album-digital/album-digital.component'; import { DisenoPapeleriaComponent } from './components/diseno-papeleria/diseno-papeleria.component'; import { HomeComponent } from './components/home/home.componen

pasted

import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    first_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
    last_name: z.string().min(2, 'El apellido debe tener al menos 2 caracteres').max(100),
    nickname: z.string().max(50).optional(),
    email: z.string().email('Email inválido'),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
      .regex(/[0-9]/, 'Debe contener al menos un número'),
    phone: z.string().max(30).optional(),
    gender: z.string().max(20).optional(),
    language: z.string().max(10).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'La contraseña es requerida'),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refresh_token: z.string().min(1, 'Refresh token requerido'),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    current_password: z.string().min(1, 'Contraseña actual requerida'),
    new_password: z
      .string()
      .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
      .regex(/[0-9]/, 'Debe contener al menos un número'),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    first_name: z.string().min(1).max(100),
    last_name:  z.string().min(1).max(100),
    nickname:   z.string().max(50).optional().nullable(),
    email:      z.string().email('Email inválido').optional(),
    phone:      z.string().max(30).optional().nullable(),
    gender:     z.enum(['male', 'female', 'non_binary', 'prefer_not']).optional().nullable(),
    language:   z.enum(['es', 'en', 'ca', 'fr']).default('es'),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];
export type UpdateProfileInput  = z.infer<typeof updateProfileSchema>['body'];
import { Router } from 'express';
import authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  updateProfileSchema,
} from '../schemas/auth.schema';

const router = Router();

// Rutas públicas
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshTokenSchema), authController.refresh);
router.get('/verify-email/:token',                                    authController.verifyEmail);
router.post('/resend-verification',                                   authController.resendVerification);

// Rutas protegidas
router.get('/me', authenticate, authController.me);
router.patch('/me', authenticate, validate(updateProfileSchema), authController.updateProfile);
router.patch('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);

export default router;
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
Mostrar más
1:01 p.m.
Tengo todo lo necesario. El plan completo:

Backend: 4 campos en users (schema) + tfa.service.ts + tfa.controller.ts + rutas + email de reset + schemas Frontend: TwoFactorAuthComponent (/auth/2fa) + sección en perfil + modificar login

Empiezo por el backend:


Ejecutó 6 comandos
Ejecutó 6 comandos
Ahora el schema.prisma necesita los 4 campos nuevos:


Instrucciones del patch para schema.prisma
Instrucciones del patch para schema.prisma
Ahora el frontend — el componente /auth/2fa y la sección de perfil:


Ejecutó 4 comandos
Ejecutó 4 comandos
Ahora necesito ver auth.controller.ts para modificar el login directamente:


Ejecutó un comando, leyó un archivo
Ejecutó un comando, leyó un archivo
9 archivos. Orden de integración:

1. Base de datos — ejecutar tfa_schema_migration.sql en psql:

powershell
docker exec -i weddly_postgres psql -U weddly -d weddly_db < tfa_schema_migration.sql
2. schema.prisma — añadir los 4 campos al model User (ver instrucciones en prisma_user_2fa.patch.txt), luego:

powershell
docker exec weddly_api npx prisma generate
3. Instalar dependencias dentro del contenedor:

powershell
docker exec weddly_api npm install speakeasy qrcode @types/speakeasy @types/qrcode
4. Backend — copiar tfa.schema.ts → src/schemas/, tfa.service.ts → src/services/, tfa.controller.ts → src/controllers/. Reemplazar auth.routes.ts con auth.routes.updated.ts. Añadir el contenido de email.additions.ts al final de utils/email.ts.

5. Modificar auth.controller.ts en el método login: si el usuario tiene tfa_enabled: true, en lugar de devolver tokens reales devuelves { success: true, requires_2fa: true, data: { temp_token } } usando signTempToken(user.id) importado desde tfa.service.

6. Frontend — copiar los 3 componentes a sus carpetas, añadir las 2 rutas en app.routes.ts, incluir <app-perfil-2fa> en el HTML de perfil, y aplicar el patch en login.component.ts para interceptar requires_2fa.

Cuando tengas el auth.controller.ts lo modificamos juntos para el paso 5.

Tfa schema migration
Código · SQL 
Tfa.schema
TS 
Tfa.service
TS 
Tfa.controller
TS 
Auth.routes.updated
TS 
Email.additions
TS 
Two factor.component
TS 
Tfa reset confirm.component
TS 
Perfil 2fa section.component
TS 


Tfa schema migration · SQL
Copiar

-- Migración 2FA: añadir campos a la tabla users
-- Ejecutar en psql dentro del contenedor postgres

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS tfa_enabled      BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tfa_secret       TEXT,
  ADD COLUMN IF NOT EXISTS tfa_reset_token  TEXT,
  ADD COLUMN IF NOT EXISTS tfa_reset_expires TIMESTAMPTZ;

-- Índice para lookup de reset tokens
CREATE INDEX IF NOT EXISTS idx_users_tfa_reset_token ON users(tfa_reset_token)
  WHERE tfa_reset_token IS NOT NULL;

  import { Component, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { FormsModule }       from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { NotificationService } from '../../services/notification/notification.service';
import { AuthService }         from '../../services/auth/auth.service';

type Step = 'code' | 'reset_sent' | 'error';

@Component({
  selector: 'app-two-factor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  template: `
<div class="tfa-page">
  <div class="tfa-card">

    <!-- Header -->
    <div class="tfa-header">
      <span class="tfa-icon">🔐</span>
      <h1>Verificación en dos pasos</h1>
      <p>Introduce el código de 6 dígitos de tu aplicación autenticadora</p>
    </div>

    <!-- Step: introducir código -->
    <ng-container *ngIf="step === 'code'">
      <div class="code-inputs">
        <input
          *ngFor="let i of [0,1,2,3,4,5]"
          type="text"
          maxlength="1"
          inputmode="numeric"
          pattern="[0-9]"
          [(ngModel)]="digits[i]"
          (input)="onDigitInput($event, i)"
          (keydown)="onKeyDown($event, i)"
          [id]="'digit-' + i"
          class="digit-input"
          autocomplete="one-time-code"
        />
      </div>

      <div *ngIf="errorMsg" class="tfa-error">{{ errorMsg }}</div>

      <button
        class="btn-primary"
        (click)="verify()"
        [disabled]="loading || digits.join('').length < 6"
      >
        <span *ngIf="!loading">Verificar</span>
        <span *ngIf="loading" class="spinner"></span>
      </button>

      <div class="tfa-footer">
        <span>¿Perdiste el acceso?</span>
        <button class="btn-link" (click)="requestReset()" [disabled]="resetLoading">
          {{ resetLoading ? 'Enviando...' : 'Recuperar por email' }}
        </button>
      </div>
    </ng-container>

    <!-- Step: email de reset enviado -->
    <ng-container *ngIf="step === 'reset_sent'">
      <div class="success-box">
        <span class="success-icon">📧</span>
        <p>
          Si el email está registrado con 2FA activo, recibirás un enlace
          para desactivarlo. Revisa tu bandeja en los próximos minutos.
        </p>
      </div>
      <button class="btn-secondary" routerLink="/login">Volver al inicio</button>
    </ng-container>

  </div>
</div>
  `,
  styles: [`
.tfa-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  font-family: 'Helvetica Neue', Arial, sans-serif;
}
.tfa-card {
  background: #fff;
  border-radius: 12px;
  padding: 48px 40px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  text-align: center;
}
.tfa-header { margin-bottom: 32px; }
.tfa-icon   { font-size: 48px; display: block; margin-bottom: 16px; }
h1 { margin: 0 0 8px; font-size: 22px; color: #222; }
p  { margin: 0; color: #666; font-size: 14px; line-height: 1.5; }

.code-inputs {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: 24px;
}
.digit-input {
  width: 46px;
  height: 54px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 24px;
  font-weight: 600;
  text-align: center;
  color: #222;
  transition: border-color 0.2s;
  outline: none;
}
.digit-input:focus { border-color: #8B6F47; }

.tfa-error {
  color: #c0392b;
  font-size: 13px;
  margin-bottom: 16px;
  background: #fff5f5;
  border-radius: 6px;
  padding: 10px 14px;
}

.btn-primary {
  width: 100%;
  padding: 14px;
  background: #8B6F47;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-primary:hover:not(:disabled) { background: #7a5f3a; }
.btn-primary:disabled { opacity: 0.6; cursor: default; }

.btn-secondary {
  width: 100%;
  margin-top: 16px;
  padding: 12px;
  background: transparent;
  color: #8B6F47;
  border: 2px solid #8B6F47;
  border-radius: 8px;
  font-size: 15px;
  cursor: pointer;
}

.tfa-footer {
  margin-top: 20px;
  font-size: 13px;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.btn-link {
  background: none;
  border: none;
  color: #8B6F47;
  cursor: pointer;
  font-size: 13px;
  text-decoration: underline;
  padding: 0;
}
.btn-link:disabled { opacity: 0.6; }

.spinner {
  display: inline-block;
  width: 18px; height: 18px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.success-box {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 24px;
}
.success-icon { font-size: 40px; display: block; margin-bottom: 12px; }
  `]
})
export class TwoFactorComponent implements OnInit {

  step:         Step    = 'code';
  digits:       string[] = ['','','','','',''];
  loading       = false;
  resetLoading  = false;
  errorMsg      = '';
  tempToken     = '';
  userEmail     = '';

  private apiUrl = 'http://localhost:3000/api';

  constructor(
    private route:        ActivatedRoute,
    private router:       Router,
    private http:         HttpClient,
    private notif:        NotificationService,
    private authService:  AuthService,
  ) {}

  ngOnInit() {
    // El temp_token y email vienen por query params desde el login
    this.tempToken = this.route.snapshot.queryParamMap.get('t')     ?? '';
    this.userEmail = this.route.snapshot.queryParamMap.get('email') ?? '';

    if (!this.tempToken) {
      this.router.navigate(['/login']);
    }
  }

  onDigitInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    const val   = input.value.replace(/\D/g, '').slice(-1);
    this.digits[index] = val;
    this.errorMsg = '';

    // Auto-avanzar al siguiente campo
    if (val && index < 5) {
      document.getElementById(`digit-${index + 1}`)?.focus();
    }
    // Auto-verificar al completar
    if (this.digits.join('').length === 6) {
      setTimeout(() => this.verify(), 100);
    }
  }

  onKeyDown(event: KeyboardEvent, index: number) {
    if (event.key === 'Backspace' && !this.digits[index] && index > 0) {
      document.getElementById(`digit-${index - 1}`)?.focus();
    }
  }

  verify() {
    const code = this.digits.join('');
    if (code.length < 6) return;

    this.loading  = true;
    this.errorMsg = '';

    this.http.post<any>(`${this.apiUrl}/auth/2fa/verify`, {
      temp_token: this.tempToken,
      token:      code,
    }).subscribe({
      next: (res) => {
        this.loading = false;
        // Guardar tokens reales y navegar
        localStorage.setItem('token',         res.data.access_token);
        localStorage.setItem('refresh_token', res.data.refresh_token);

        // Cargar datos del usuario
        this.http.get<any>(`${this.apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${res.data.access_token}` }
        }).subscribe({
          next: (meRes) => {
            const u = meRes.data;
            localStorage.setItem('userId',    u.id);
            localStorage.setItem('userEmail', u.email);
            localStorage.setItem('firstName', u.first_name);
            localStorage.setItem('lastName',  u.last_name);
            localStorage.setItem('rol',       u.role_global);
            this.router.navigate(['/dashboard']);
          },
          error: () => this.router.navigate(['/dashboard']),
        });
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.message || 'Código incorrecto. Inténtalo de nuevo.';
        // Limpiar campos
        this.digits = ['','','','','',''];
        document.getElementById('digit-0')?.focus();
      },
    });
  }

  requestReset() {
    if (!this.userEmail) {
      this.notif.showError('Error', 'No se pudo determinar el email. Vuelve al login.');
      return;
    }
    this.resetLoading = true;
    this.http.post<any>(`${this.apiUrl}/auth/2fa/reset/request`, {
      email: this.userEmail,
    }).subscribe({
      next:  ()  => { this.resetLoading = false; this.step = 'reset_sent'; },
      error: ()  => { this.resetLoading = false; this.step = 'reset_sent'; }, // idem para no filtrar
    });
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-tfa-reset-confirm',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule],
  template: `
<div class="page">
  <div class="card">
    <ng-container *ngIf="status === 'loading'">
      <span class="icon">⏳</span>
      <h2>Procesando...</h2>
      <p>Estamos desactivando tu 2FA, espera un momento.</p>
    </ng-container>
    <ng-container *ngIf="status === 'success'">
      <span class="icon">✅</span>
      <h2>2FA desactivado</h2>
      <p>Ya puedes iniciar sesión con tu contraseña.</p>
      <a routerLink="/login" class="btn">Ir al login</a>
    </ng-container>
    <ng-container *ngIf="status === 'error'">
      <span class="icon">❌</span>
      <h2>Enlace inválido o expirado</h2>
      <p>{{ errorMsg }}</p>
      <a routerLink="/login" class="btn btn-sec">Volver al login</a>
    </ng-container>
  </div>
</div>
  `,
  styles: [`
.page { min-height:100vh; display:flex; align-items:center; justify-content:center; background:#f5f5f5; }
.card { background:#fff; border-radius:12px; padding:48px 40px; max-width:420px; width:100%;
        text-align:center; box-shadow:0 4px 24px rgba(0,0,0,.08); }
.icon { font-size:52px; display:block; margin-bottom:16px; }
h2   { margin:0 0 8px; color:#222; }
p    { color:#666; font-size:14px; line-height:1.6; }
.btn { display:inline-block; margin-top:24px; padding:13px 32px; background:#8B6F47;
       color:#fff; border-radius:8px; text-decoration:none; font-weight:600; }
.btn-sec { background:transparent; color:#8B6F47; border:2px solid #8B6F47; }
  `]
})
export class TfaResetConfirmComponent implements OnInit {
  status:   'loading' | 'success' | 'error' = 'loading';
  errorMsg  = '';

  constructor(
    private route:  ActivatedRoute,
    private http:   HttpClient,
  ) {}

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!token) { this.status = 'error'; this.errorMsg = 'Token no encontrado.'; return; }

    this.http.post<any>('http://localhost:3000/api/auth/2fa/reset/confirm', {
      reset_token: token,
    }).subscribe({
      next:  ()    => { this.status = 'success'; },
      error: (err) => {
        this.status   = 'error';
        this.errorMsg = err?.error?.message || 'El enlace ha expirado. Solicita uno nuevo.';
      },
    });
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { FormsModule }       from '@angular/forms';
import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';
import { NotificationService } from '../../services/notification/notification.service';

type SetupStep = 'idle' | 'qr' | 'confirm' | 'done';

@Component({
  selector: 'app-perfil-2fa',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
<div class="tfa-section">
  <div class="tfa-header-row">
    <div>
      <h3>Autenticación en dos pasos (2FA)</h3>
      <p class="tfa-desc">
        Añade una capa extra de seguridad con una app autenticadora
        (Google Authenticator, Authy, etc.)
      </p>
    </div>
    <span class="tfa-badge" [class.active]="tfaEnabled">
      {{ tfaEnabled ? '✅ Activo' : '⭕ Inactivo' }}
    </span>
  </div>

  <!-- Estado: 2FA inactivo — mostrar flujo de activación -->
  <ng-container *ngIf="!tfaEnabled">

    <!-- Paso: botón inicial -->
    <div *ngIf="setupStep === 'idle'" class="tfa-action">
      <button class="btn-activate" (click)="startSetup()" [disabled]="loading">
        {{ loading ? 'Generando...' : 'Activar 2FA' }}
      </button>
    </div>

    <!-- Paso: mostrar QR -->
    <div *ngIf="setupStep === 'qr'" class="tfa-qr-block">
      <p class="qr-instructions">
        Escanea este código QR con tu app autenticadora y luego
        introduce el código de 6 dígitos para confirmar.
      </p>
      <img [src]="qrDataUrl" alt="QR 2FA" class="qr-img" />
      <div class="token-input-row">
        <input
          type="text"
          inputmode="numeric"
          maxlength="6"
          placeholder="123456"
          [(ngModel)]="verifyToken"
          class="token-input"
          (keydown.enter)="confirmSetup()"
        />
        <button class="btn-confirm" (click)="confirmSetup()" [disabled]="loading || verifyToken.length < 6">
          {{ loading ? 'Verificando...' : 'Confirmar' }}
        </button>
      </div>
      <div *ngIf="errorMsg" class="tfa-error">{{ errorMsg }}</div>
      <button class="btn-cancel" (click)="cancelSetup()">Cancelar</button>
    </div>

    <!-- Paso: activación confirmada -->
    <div *ngIf="setupStep === 'done'" class="tfa-done">
      <p>✅ El 2FA se ha activado correctamente. A partir de ahora necesitarás tu app para iniciar sesión.</p>
    </div>

  </ng-container>

  <!-- Estado: 2FA activo — mostrar opción de desactivar -->
  <ng-container *ngIf="tfaEnabled">
    <div *ngIf="!showDisableForm" class="tfa-action">
      <button class="btn-deactivate" (click)="showDisableForm = true">
        Desactivar 2FA
      </button>
    </div>
    <div *ngIf="showDisableForm" class="disable-form">
      <p class="disable-warning">
        ⚠️ Para desactivar el 2FA confirma tu contraseña actual.
      </p>
      <input
        type="password"
        placeholder="Tu contraseña actual"
        [(ngModel)]="disablePassword"
        class="token-input"
        (keydown.enter)="disable()"
      />
      <div *ngIf="errorMsg" class="tfa-error">{{ errorMsg }}</div>
      <div class="disable-actions">
        <button class="btn-deactivate" (click)="disable()" [disabled]="loading || !disablePassword">
          {{ loading ? 'Procesando...' : 'Confirmar desactivación' }}
        </button>
        <button class="btn-cancel" (click)="showDisableForm = false; errorMsg = ''">Cancelar</button>
      </div>
    </div>
  </ng-container>

</div>
  `,
  styles: [`
.tfa-section {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 24px;
  margin-top: 24px;
}
.tfa-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}
h3 { margin: 0 0 4px; font-size: 16px; color: #111; }
.tfa-desc { margin: 0; font-size: 13px; color: #666; }
.tfa-badge {
  font-size: 13px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 20px;
  background: #f3f4f6;
  color: #888;
  white-space: nowrap;
}
.tfa-badge.active { background: #dcfce7; color: #15803d; }

.btn-activate {
  padding: 10px 24px;
  background: #8B6F47;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.btn-activate:hover:not(:disabled) { background: #7a5f3a; }

.btn-deactivate {
  padding: 10px 24px;
  background: transparent;
  color: #c0392b;
  border: 2px solid #c0392b;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.tfa-qr-block { text-align: center; }
.qr-instructions { font-size: 14px; color: #555; margin-bottom: 16px; }
.qr-img { width: 180px; height: 180px; border-radius: 8px; border: 1px solid #eee; margin-bottom: 20px; }

.token-input-row { display: flex; gap: 10px; justify-content: center; margin-bottom: 8px; }
.token-input {
  padding: 10px 14px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 20px;
  letter-spacing: 4px;
  width: 140px;
  text-align: center;
  outline: none;
}
.token-input:focus { border-color: #8B6F47; }

.btn-confirm {
  padding: 10px 20px;
  background: #22c55e;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.btn-confirm:disabled { opacity: 0.6; }

.btn-cancel {
  background: none;
  border: none;
  color: #999;
  font-size: 13px;
  cursor: pointer;
  margin-top: 8px;
  text-decoration: underline;
  display: block;
  margin: 10px auto 0;
}

.tfa-error {
  color: #c0392b;
  font-size: 13px;
  background: #fff5f5;
  border-radius: 6px;
  padding: 8px 12px;
  margin: 8px 0;
}

.tfa-done { color: #15803d; font-size: 14px; background: #dcfce7; border-radius: 8px; padding: 14px 16px; }

.disable-warning { font-size: 13px; color: #c0392b; margin-bottom: 12px; }
.disable-actions { display: flex; gap: 12px; align-items: center; margin-top: 12px; }
  `]
})
export class Perfil2faComponent implements OnInit {

  tfaEnabled     = false;
  setupStep: SetupStep = 'idle';
  qrDataUrl      = '';
  verifyToken    = '';
  loading        = false;
  errorMsg       = '';
  showDisableForm = false;
  disablePassword = '';

  private apiUrl = 'http://localhost:3000/api';

  constructor(
    private http:  HttpClient,
    private notif: NotificationService,
  ) {}

  ngOnInit() { this.loadStatus(); }

  private getHeaders() {
    const token = localStorage.getItem('token');
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  loadStatus() {
    this.http.get<any>(`${this.apiUrl}/auth/2fa/status`, this.getHeaders()).subscribe({
      next: (res) => { this.tfaEnabled = res.data.enabled; },
    });
  }

  startSetup() {
    this.loading = true;
    this.http.post<any>(`${this.apiUrl}/auth/2fa/setup`, {}, this.getHeaders()).subscribe({
      next: (res) => {
        this.loading    = false;
        this.qrDataUrl  = res.data.qr_data_url;
        this.setupStep  = 'qr';
      },
      error: (err) => {
        this.loading  = false;
        this.notif.showError('Error', err?.error?.message || 'No se pudo generar el QR');
      },
    });
  }

  confirmSetup() {
    if (this.verifyToken.length < 6) return;
    this.loading  = true;
    this.errorMsg = '';

    this.http.post<any>(`${this.apiUrl}/auth/2fa/setup/verify`, {
      token: this.verifyToken,
    }, this.getHeaders()).subscribe({
      next: () => {
        this.loading    = false;
        this.tfaEnabled = true;
        this.setupStep  = 'done';
        this.notif.showSuccess('✅ 2FA activado', 'Tu cuenta está más protegida');
      },
      error: (err) => {
        this.loading  = false;
        this.errorMsg = err?.error?.message || 'Código incorrecto. Inténtalo de nuevo.';
        this.verifyToken = '';
      },
    });
  }

  cancelSetup() {
    this.setupStep   = 'idle';
    this.qrDataUrl   = '';
    this.verifyToken = '';
    this.errorMsg    = '';
  }

  disable() {
    if (!this.disablePassword) return;
    this.loading  = true;
    this.errorMsg = '';

    this.http.delete<any>(`${this.apiUrl}/auth/2fa`, {
      ...this.getHeaders(),
      body: { password: this.disablePassword },
    }).subscribe({
      next: () => {
        this.loading         = false;
        this.tfaEnabled      = false;
        this.showDisableForm = false;
        this.disablePassword = '';
        this.setupStep       = 'idle';
        this.notif.showSuccess('2FA desactivado', 'Ya no se requerirá verificación adicional');
      },
      error: (err) => {
        this.loading  = false;
        this.errorMsg = err?.error?.message || 'Contraseña incorrecta';
      },
    });
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { FormsModule }       from '@angular/forms';
import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';
import { NotificationService } from '../../services/notification/notification.service';

type SetupStep = 'idle' | 'qr' | 'confirm' | 'done';

@Component({
  selector: 'app-perfil-2fa',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
<div class="tfa-section">
  <div class="tfa-header-row">
    <div>
      <h3>Autenticación en dos pasos (2FA)</h3>
      <p class="tfa-desc">
        Añade una capa extra de seguridad con una app autenticadora
        (Google Authenticator, Authy, etc.)
      </p>
    </div>
    <span class="tfa-badge" [class.active]="tfaEnabled">
      {{ tfaEnabled ? '✅ Activo' : '⭕ Inactivo' }}
    </span>
  </div>

  <!-- Estado: 2FA inactivo — mostrar flujo de activación -->
  <ng-container *ngIf="!tfaEnabled">

    <!-- Paso: botón inicial -->
    <div *ngIf="setupStep === 'idle'" class="tfa-action">
      <button class="btn-activate" (click)="startSetup()" [disabled]="loading">
        {{ loading ? 'Generando...' : 'Activar 2FA' }}
      </button>
    </div>

    <!-- Paso: mostrar QR -->
    <div *ngIf="setupStep === 'qr'" class="tfa-qr-block">
      <p class="qr-instructions">
        Escanea este código QR con tu app autenticadora y luego
        introduce el código de 6 dígitos para confirmar.
      </p>
      <img [src]="qrDataUrl" alt="QR 2FA" class="qr-img" />
      <div class="token-input-row">
        <input
          type="text"
          inputmode="numeric"
          maxlength="6"
          placeholder="123456"
          [(ngModel)]="verifyToken"
          class="token-input"
          (keydown.enter)="confirmSetup()"
        />
        <button class="btn-confirm" (click)="confirmSetup()" [disabled]="loading || verifyToken.length < 6">
          {{ loading ? 'Verificando...' : 'Confirmar' }}
        </button>
      </div>
      <div *ngIf="errorMsg" class="tfa-error">{{ errorMsg }}</div>
      <button class="btn-cancel" (click)="cancelSetup()">Cancelar</button>
    </div>

    <!-- Paso: activación confirmada -->
    <div *ngIf="setupStep === 'done'" class="tfa-done">
      <p>✅ El 2FA se ha activado correctamente. A partir de ahora necesitarás tu app para iniciar sesión.</p>
    </div>

  </ng-container>

  <!-- Estado: 2FA activo — mostrar opción de desactivar -->
  <ng-container *ngIf="tfaEnabled">
    <div *ngIf="!showDisableForm" class="tfa-action">
      <button class="btn-deactivate" (click)="showDisableForm = true">
        Desactivar 2FA
      </button>
    </div>
    <div *ngIf="showDisableForm" class="disable-form">
      <p class="disable-warning">
        ⚠️ Para desactivar el 2FA confirma tu contraseña actual.
      </p>
      <input
        type="password"
        placeholder="Tu contraseña actual"
        [(ngModel)]="disablePassword"
        class="token-input"
        (keydown.enter)="disable()"
      />
      <div *ngIf="errorMsg" class="tfa-error">{{ errorMsg }}</div>
      <div class="disable-actions">
        <button class="btn-deactivate" (click)="disable()" [disabled]="loading || !disablePassword">
          {{ loading ? 'Procesando...' : 'Confirmar desactivación' }}
        </button>
        <button class="btn-cancel" (click)="showDisableForm = false; errorMsg = ''">Cancelar</button>
      </div>
    </div>
  </ng-container>

</div>
  `,
  styles: [`
.tfa-section {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 24px;
  margin-top: 24px;
}
.tfa-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}
h3 { margin: 0 0 4px; font-size: 16px; color: #111; }
.tfa-desc { margin: 0; font-size: 13px; color: #666; }
.tfa-badge {
  font-size: 13px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 20px;
  background: #f3f4f6;
  color: #888;
  white-space: nowrap;
}
.tfa-badge.active { background: #dcfce7; color: #15803d; }

.btn-activate {
  padding: 10px 24px;
  background: #8B6F47;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.btn-activate:hover:not(:disabled) { background: #7a5f3a; }

.btn-deactivate {
  padding: 10px 24px;
  background: transparent;
  color: #c0392b;
  border: 2px solid #c0392b;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.tfa-qr-block { text-align: center; }
.qr-instructions { font-size: 14px; color: #555; margin-bottom: 16px; }
.qr-img { width: 180px; height: 180px; border-radius: 8px; border: 1px solid #eee; margin-bottom: 20px; }

.token-input-row { display: flex; gap: 10px; justify-content: center; margin-bottom: 8px; }
.token-input {
  padding: 10px 14px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 20px;
  letter-spacing: 4px;
  width: 140px;
  text-align: center;
  outline: none;
}
.token-input:focus { border-color: #8B6F47; }

.btn-confirm {
  padding: 10px 20px;
  background: #22c55e;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.btn-confirm:disabled { opacity: 0.6; }

.btn-cancel {
  background: none;
  border: none;
  color: #999;
  font-size: 13px;
  cursor: pointer;
  margin-top: 8px;
  text-decoration: underline;
  display: block;
  margin: 10px auto 0;
}

.tfa-error {
  color: #c0392b;
  font-size: 13px;
  background: #fff5f5;
  border-radius: 6px;
  padding: 8px 12px;
  margin: 8px 0;
}

.tfa-done { color: #15803d; font-size: 14px; background: #dcfce7; border-radius: 8px; padding: 14px 16px; }

.disable-warning { font-size: 13px; color: #c0392b; margin-bottom: 12px; }
.disable-actions { display: flex; gap: 12px; align-items: center; margin-top: 12px; }
  `]
})
export class Perfil2faComponent implements OnInit {

  tfaEnabled     = false;
  setupStep: SetupStep = 'idle';
  qrDataUrl      = '';
  verifyToken    = '';
  loading        = false;
  errorMsg       = '';
  showDisableForm = false;
  disablePassword = '';

  private apiUrl = 'http://localhost:3000/api';

  constructor(
    private http:  HttpClient,
    private notif: NotificationService,
  ) {}

  ngOnInit() { this.loadStatus(); }

  private getHeaders() {
    const token = localStorage.getItem('token');
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  loadStatus() {
    this.http.get<any>(`${this.apiUrl}/auth/2fa/status`, this.getHeaders()).subscribe({
      next: (res) => { this.tfaEnabled = res.data.enabled; },
    });
  }

  startSetup() {
    this.loading = true;
    this.http.post<any>(`${this.apiUrl}/auth/2fa/setup`, {}, this.getHeaders()).subscribe({
      next: (res) => {
        this.loading    = false;
        this.qrDataUrl  = res.data.qr_data_url;
        this.setupStep  = 'qr';
      },
      error: (err) => {
        this.loading  = false;
        this.notif.showError('Error', err?.error?.message || 'No se pudo generar el QR');
      },
    });
  }

  confirmSetup() {
    if (this.verifyToken.length < 6) return;
    this.loading  = true;
    this.errorMsg = '';

    this.http.post<any>(`${this.apiUrl}/auth/2fa/setup/verify`, {
      token: this.verifyToken,
    }, this.getHeaders()).subscribe({
      next: () => {
        this.loading    = false;
        this.tfaEnabled = true;
        this.setupStep  = 'done';
        this.notif.showSuccess('✅ 2FA activado', 'Tu cuenta está más protegida');
      },
      error: (err) => {
        this.loading  = false;
        this.errorMsg = err?.error?.message || 'Código incorrecto. Inténtalo de nuevo.';
        this.verifyToken = '';
      },
    });
  }

  cancelSetup() {
    this.setupStep   = 'idle';
    this.qrDataUrl   = '';
    this.verifyToken = '';
    this.errorMsg    = '';
  }

  disable() {
    if (!this.disablePassword) return;
    this.loading  = true;
    this.errorMsg = '';

    this.http.delete<any>(`${this.apiUrl}/auth/2fa`, {
      ...this.getHeaders(),
      body: { password: this.disablePassword },
    }).subscribe({
      next: () => {
        this.loading         = false;
        this.tfaEnabled      = false;
        this.showDisableForm = false;
        this.disablePassword = '';
        this.setupStep       = 'idle';
        this.notif.showSuccess('2FA desactivado', 'Ya no se requerirá verificación adicional');
      },
      error: (err) => {
        this.loading  = false;
        this.errorMsg = err?.error?.message || 'Contraseña incorrecta';
      },
    });
  }
}