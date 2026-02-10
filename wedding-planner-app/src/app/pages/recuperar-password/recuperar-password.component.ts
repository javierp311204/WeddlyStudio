import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { NotificationService } from '../../services/notification/notification.service';

@Component({
  selector: 'app-recuperar-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './recuperar-password.component.html',
  styleUrl: './recuperar-password.component.css'
})
export class RecuperarPasswordComponent {
  email: string = '';
  enviando: boolean = false;
  emailEnviado: boolean = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private notifService: NotificationService
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

    this.http.post('http://localhost:3000/api/auth/solicitar-recuperacion', { 
      email: this.email.toLowerCase() 
    }).subscribe({
      next: (response: any) => {
        this.enviando = false;
        this.emailEnviado = true;
        this.notifService.showSuccess(
          'Email enviado',
          'Si tu email está registrado, recibirás instrucciones para recuperar tu contraseña.'
        );
      },
      error: (err) => {
        this.enviando = false;
        this.notifService.showError(
          'Error',
          'Hubo un problema al procesar tu solicitud. Inténtalo de nuevo.'
        );
        console.error('Error en recuperación:', err);
      }
    });
  }

  volverAlLogin() {
    this.router.navigate(['/login']);
  }
}