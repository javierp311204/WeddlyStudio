import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { NotificationService } from '../../services/notification/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  email: string = '';
  pass: string = '';
  mostrarPassword: boolean = false;

  private API_URL = 'http://localhost:3000/api/auth/login';

  constructor(
    private http: HttpClient,
    private router: Router,
    private notifService: NotificationService,
  ) {}

  togglePassword() {
    this.mostrarPassword = !this.mostrarPassword;
  }

  login() {
    if (!this.email || !this.pass) {
      this.notifService.showError(
        'Campos incompletos',
        'Por favor, introduce tus credenciales'
      );
      return;
    }

    const credenciales = {
      email: this.email,
      pass: this.pass,
    };

    this.http.post<any>(this.API_URL, credenciales).subscribe({
      next: (res) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('rol', res.rol);
        localStorage.setItem('codigoBoda', res.codigoBoda);
        localStorage.setItem('usuarioEmail', res.email);
        localStorage.setItem('usuarioNick', res.nick);
        localStorage.setItem('tipoUsuario', res.tipoUsuario || 'invitado');

        this.notifService.showSuccess(
          'Login exitoso',
          `¡Bienvenido de nuevo, ${res.nick || 'Invitado'}!`
        );

        this.router.navigate(['/home']);
      },
      error: (err) => {
        // ✨ MANEJAR ERROR DE EMAIL NO VERIFICADO
        if (err.status === 403 && err.error?.emailNoVerificado) {
          this.notifService.showError(
            'Email no verificado',
            'Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja de entrada y spam.'
          );
        } else {
          const mensaje = err.error?.mensaje || 'Credenciales incorrectas. Inténtalo de nuevo.';
          this.notifService.showError('Error de login', mensaje);
        }
        console.error('Error en login:', err);
      },
    });
  }

  // ✨ NUEVA FUNCIÓN: Ir a recuperar contraseña
  irARecuperarPassword() {
    this.router.navigate(['/recuperar-password']);
  }

  irAlHome() {
    this.router.navigate(['/home']);
  }
}