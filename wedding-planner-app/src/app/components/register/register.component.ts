import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { NotificationService } from '../../services/notification/notification.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  email: string = '';
  pass: string = '';
  rol: string = 'invitado'; 
  codigoBoda: string = '';
  nick: string = '';
  mostrarPassword: boolean = false;

  constructor(
    private http: HttpClient, 
    private router: Router, 
    private notifService: NotificationService
  ) {}

  togglePassword() {
    this.mostrarPassword = !this.mostrarPassword;
  }

  registrar() {
    const emailPattern = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$/;

    if (!emailPattern.test(this.email.toLowerCase())) {
      this.notifService.showError('Email Inválido', 'Por favor, ingresa un correo electrónico válido.');
      return; 
    }

    if (!this.email || !this.pass || !this.codigoBoda || !this.nick) {
      this.notifService.showError('Campos incompletos', 'Todos los campos son obligatorios.');
      return;
    }

    const datos = {
      email: this.email.toLowerCase(),
      pass: this.pass,
      rol: this.rol,
      codigoBoda: this.codigoBoda.toUpperCase(),
      nick: this.nick 
    };

    this.http.post('http://localhost:3000/api/auth/registro', datos).subscribe({
      next: () => {
        this.notifService.showSuccess('¡Bienvenido!', 'Registro exitoso. Redirigiendo al login...');
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err) => {
        const mensaje = err.error?.error || 'Ocurrió un error inesperado';
        this.notifService.showError('Error al registrarse', mensaje);
      }
    });
  }
}