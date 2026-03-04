import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NotificationService } from '../../services/notification/notification.service';

// ─────────────────────────────────────────────────────────────
// MIGRACIÓN v2:
//  • Endpoint: POST /api/auth/register (antes /api/auth/registro)
//  • Body v2: { first_name, last_name, email, password, [nickname, phone] }
//    NO existe campo rol ni codigoBoda en el registro.
//    En v2 el rol se asigna al unirse a una boda, no al registrarse.
//  • Respuesta v2: { access_token, refresh_token, user }
//  • Verificación de email: no implementada en v2 aún → se omite lógica de espera
//
//  CAMBIO DE FLUJO:
//    Antes: registro = (email + pass + rol + codigoBoda + nick) → un solo paso
//    Ahora: 
//      1. Registro = (first_name, last_name, email, password) → crea cuenta
//      2. Si viene con código de boda en la URL, tras registrarse → redirigir
//         a la pantalla de unirse a boda (pendiente de implementar) o al home.
// ─────────────────────────────────────────────────────────────

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule, TranslateModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit {
  // v2: campos separados first_name / last_name (antes: nick)
  first_name: string = '';
  last_name: string = '';
  email: string = '';
  pass: string = '';
  mostrarPassword: boolean = false;

  // v2: el codigoBoda/weddingId ya no forma parte del registro
  // Se mantiene en la UI por UX (para mostrar mensajes), pero NO se envía al backend
  codigoBodaReferencia: string = '';

  private API_URL = 'http://localhost:3000/api/auth';

  constructor(
    private http: HttpClient,
    private router: Router,
    private notifService: NotificationService,
    private translate: TranslateService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const codigo = this.route.snapshot.queryParamMap.get('codigo');
    if (codigo) {
      this.codigoBodaReferencia = codigo.toUpperCase();
    }
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

    // v2: body con first_name, last_name, email, password
    const datos = {
      first_name: this.first_name.trim(),
      last_name:  this.last_name.trim() || undefined,
      email:      this.email.toLowerCase(),
      password:   this.pass,
    };

    // v2: POST /api/auth/register
    this.http.post<any>(`${this.API_URL}/register`, datos).subscribe({
      next: (res) => {
        // v2: el register devuelve tokens directamente (sin verificación de email)
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

        // Si tenía código de boda, ir al home (allí se gestionará la unión)
        setTimeout(() => this.router.navigate(['/home']), 1500);
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