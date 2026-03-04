import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NotificationService } from '../../services/notification/notification.service';

// ─────────────────────────────────────────────────────────────
// MIGRACIÓN v2:
//  • Endpoint: POST /api/auth/login (igual, mismo path)
//  • Body: { email, password }  ← antes: { email, pass }
//  • Respuesta v2: { access_token, refresh_token, user: { id, email, globalRole, ... } }
//    antes: { token, rol, codigoBoda, email, nick, tipoUsuario }
//  • localStorage:
//      'token'       → access_token
//      'refresh_token' → refresh_token (nuevo)
//      'weddingId'   → se obtiene llamando GET /api/weddings tras login
//      'usuarioNick' → user.first_name (o user.nickname si existe)
//      'rol'         → user.globalRole
//    Se eliminan: 'codigoBoda', 'tipoUsuario'
//  • emailNoVerificado: v2 no implementa verificación de email aún
// ─────────────────────────────────────────────────────────────

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

  private API_URL = 'http://localhost:3000/api/auth';

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

    // v2: campo 'password' en lugar de 'pass'
    const credenciales = { email: this.email, password: this.pass };

    this.http.post<any>(`${this.API_URL}/login`, credenciales).subscribe({
      next: (res) => {
        // v2: guardar access_token + refresh_token
        localStorage.setItem('token', res.access_token);
        localStorage.setItem('refresh_token', res.refresh_token ?? '');

        // v2: datos del usuario vienen en res.user
        const user = res.user ?? res;
        localStorage.setItem('usuarioNick', user.nickname || user.first_name || user.email);
        localStorage.setItem('rol', user.globalRole ?? user.role_global ?? 'user');

        // v2: obtener la primera boda del usuario y guardar weddingId
        this.cargarWeddingId(res.access_token);

        this.notifService.showSuccess(
          this.translate.instant('AUTH.LOGIN_SUCCESS_TITLE'),
          this.translate.instant('AUTH.LOGIN_SUCCESS_DESC', {
            nick: user.nickname || user.first_name || this.translate.instant('AUTH.GUEST')
          })
        );

        // La navegación ocurre en cargarWeddingId tras obtener el weddingId
      },
      error: (err) => {
        const mensaje = err.error?.message || this.translate.instant('AUTH.LOGIN_INVALID_CREDENTIALS');
        this.notifService.showError(
          this.translate.instant('AUTH.LOGIN_ERROR_TITLE'),
          mensaje
        );
        console.error('Error en login:', err);
      },
    });
  }

  private cargarWeddingId(token: string) {
    // v2: GET /api/weddings → { data: [{ id, ... }] }
    this.http
      .get<any>(`${this.API_URL.replace('/auth', '')}/weddings`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .subscribe({
        next: (res) => {
          const bodas = res?.data ?? res ?? [];
          if (Array.isArray(bodas) && bodas.length > 0) {
            localStorage.setItem('weddingId', bodas[0].id);
          }
          this.router.navigate(['/home']);
        },
        error: () => {
          // Si no hay bodas o falla, ir igualmente al home
          this.router.navigate(['/home']);
        }
      });
  }

  irARecuperarPassword() {
    this.router.navigate(['/recuperar-password']);
  }

  irAlHome() {
    this.router.navigate(['/home']);
  }
}