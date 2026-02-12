import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NotificationService } from '../../services/notification/notification.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule],
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
    private notifService: NotificationService,
    private translate: TranslateService
  ) {}

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

    if (!this.email || !this.pass || !this.codigoBoda || !this.nick) {
      this.notifService.showError(
        this.translate.instant('AUTH.INCOMPLETE_FIELDS_TITLE'),
        this.translate.instant('AUTH.INCOMPLETE_FIELDS_DESC')
      );
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
      next: (response: any) => {
        this.notifService.showSuccess(
          this.translate.instant('AUTH.ACCOUNT_CREATED_TITLE'),
          this.translate.instant('AUTH.ACCOUNT_CREATED_DESC', { email: this.email })
        );
        
        setTimeout(() => this.router.navigate(['/login']), 4000);
      },
      error: (err) => {
        const mensaje = err.error?.error || this.translate.instant('NOTIFICATIONS.ERROR_SAVING');
        this.notifService.showError(
          this.translate.instant('AUTH.REGISTER_ERROR_TITLE'),
          mensaje
        );
      }
    });
  }
}