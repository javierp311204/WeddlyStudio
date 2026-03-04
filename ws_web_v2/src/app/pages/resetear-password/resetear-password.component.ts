import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from '../../services/notification/notification.service';

// ─────────────────────────────────────────────────────────────
// MIGRACIÓN v2:
//  • Endpoint: /api/auth/resetear-password
//           → /api/auth/reset-password
//  • Body:    { token, nuevaPassword }
//          → { token, new_password }   ← snake_case
// ─────────────────────────────────────────────────────────────

@Component({
  selector: 'app-resetear-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './resetear-password.component.html',
  styleUrl: './resetear-password.component.css',
})
export class ResetearPasswordComponent implements OnInit {
  token: string = '';
  nuevaPassword: string = '';
  confirmarPassword: string = '';
  mostrarPassword: boolean = false;
  mostrarConfirmar: boolean = false;

  procesando: boolean = false;
  resetExitoso: boolean = false;
  tokenInvalido: boolean = false;
  mensajeError: string = '';

  private readonly API = 'http://localhost:3000/api';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private notifService: NotificationService,
  ) {}

  ngOnInit() {
    const tokenParam = this.route.snapshot.queryParamMap.get('token');

    if (!tokenParam) {
      this.tokenInvalido = true;
      this.mensajeError = 'Token de recuperación no encontrado en la URL.';
    } else {
      this.token = tokenParam;
    }
  }

  togglePassword(campo: 'nueva' | 'confirmar') {
    if (campo === 'nueva') {
      this.mostrarPassword = !this.mostrarPassword;
    } else {
      this.mostrarConfirmar = !this.mostrarConfirmar;
    }
  }

  resetearPassword() {
    if (!this.nuevaPassword || !this.confirmarPassword) {
      this.notifService.showError('Campos incompletos', 'Por favor, completa todos los campos.');
      return;
    }
    if (this.nuevaPassword.length < 6) {
      this.notifService.showError('Contraseña débil', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (this.nuevaPassword !== this.confirmarPassword) {
      this.notifService.showError('Contraseñas no coinciden', 'Las contraseñas ingresadas no son iguales.');
      return;
    }

    this.procesando = true;

    // v2: endpoint /api/auth/reset-password, body usa new_password (snake_case)
    this.http.post(`${this.API}/auth/reset-password`, {
      token: this.token,
      new_password: this.nuevaPassword,   // v2: antes era 'nuevaPassword'
    }).subscribe({
      next: () => {
        this.procesando = false;
        this.resetExitoso = true;
        this.notifService.showSuccess(
          '¡Contraseña actualizada!',
          'Tu contraseña ha sido cambiada exitosamente.',
        );
        setTimeout(() => this.router.navigate(['/login']), 3000);
      },
      error: (err) => {
        this.procesando = false;
        const mensaje =
          err.error?.message ||
          err.error?.error ||
          'Error al resetear la contraseña. El token puede haber expirado.';
        this.notifService.showError('Error', mensaje);

        if (err.status === 400 || err.status === 404) {
          this.tokenInvalido = true;
          this.mensajeError = mensaje;
        }
      },
    });
  }

  irAlLogin() {
    this.router.navigate(['/login']);
  }

  solicitarNuevoEnlace() {
    this.router.navigate(['/recuperar-password']);
  }
}