import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { NotificationService } from '../../services/notification/notification.service';

// ─────────────────────────────────────────────────────────────
// MIGRACIÓN v2:
//  • Endpoint: /api/auth/solicitar-recuperacion
//           → /api/auth/forgot-password
//  • Body y respuesta no cambian — sigue siendo { email }
// ─────────────────────────────────────────────────────────────

@Component({
  selector: 'app-recuperar-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './recuperar-password.component.html',
  styleUrl: './recuperar-password.component.css',
})
export class RecuperarPasswordComponent {
  email: string = '';
  enviando: boolean = false;
  emailEnviado: boolean = false;

  private readonly API = 'http://localhost:3000/api';

  constructor(
    private http: HttpClient,
    private router: Router,
    private notifService: NotificationService,
  ) {}

  solicitarRecuperacion() {
    const emailPattern = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$/;

    if (!this.email) {
      this.notifService.showError('Campo requerido', 'Por favor, ingresa tu email.');
      return;
    }
    if (!emailPattern.test(this.email.toLowerCase())) {
      this.notifService.showError('Email inválido', 'Por favor, ingresa un correo electrónico válido.');
      return;
    }

    this.enviando = true;

    // v2: /api/auth/forgot-password (antes /api/auth/solicitar-recuperacion)
    this.http.post(`${this.API}/auth/forgot-password`, {
      email: this.email.toLowerCase(),
    }).subscribe({
      next: () => {
        this.enviando = false;
        this.emailEnviado = true;
        this.notifService.showSuccess(
          'Email enviado',
          'Si tu email está registrado, recibirás instrucciones para recuperar tu contraseña.',
        );
      },
      error: (err) => {
        this.enviando = false;
        this.notifService.showError(
          'Error',
          'Hubo un problema al procesar tu solicitud. Inténtalo de nuevo.',
        );
        console.error('Error en recuperación:', err);
      },
    });
  }

  volverAlLogin() {
    this.router.navigate(['/login']);
  }
}