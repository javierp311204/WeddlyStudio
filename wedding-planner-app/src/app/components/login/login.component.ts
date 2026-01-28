import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http'; // Añadido HttpClientModule
import { Router, RouterModule } from '@angular/router';
import { NotificationService } from '../../services/notification/notification.service';
import { AuthService } from '../../services/auth/auth.service'; // Asegúrate de importar tu AuthService

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

  private API_URL = 'http://localhost:3000/api/auth/login';

  constructor(
    private http: HttpClient,
    private router: Router,
    private notifService: NotificationService,
  ) {}

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

        this.notifService.showSuccess(
          'Login exitoso',
          `¡Bienvenido de nuevo, ${res.nick || 'Invitado'}!`
        );

        // Redirección común al Home
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.notifService.showError(
          'Error de login',
          'Credenciales incorrectas. Inténtalo de nuevo.'
        );
        console.error('Error en login:', err);
      },
    });
  }

  // El botón para regresar al Home desde el Login
  irAlHome() {
    this.router.navigate(['/home']);
  }
}
