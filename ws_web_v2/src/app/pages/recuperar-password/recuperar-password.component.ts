import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NotificationService } from '../../services/notification/notification.service';
import { IconComponent } from '../../shared/icons/icon.component';

@Component({
  selector: 'app-recuperar-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule, IconComponent],
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
    private translate: TranslateService,
  ) {}

  solicitarRecuperacion() {
    const emailPattern = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$/;

    if (!this.email) {
      this.notifService.showError(
        this.translate.instant('RECOVERY.ERROR_TITLE'),
        this.translate.instant('AUTH.INCOMPLETE_FIELDS_DESC')
      );
      return;
    }
    if (!emailPattern.test(this.email.toLowerCase())) {
      this.notifService.showError(
        this.translate.instant('RECOVERY.ERROR_TITLE'),
        this.translate.instant('AUTH.INVALID_EMAIL_DESC')
      );
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
          this.translate.instant('RECOVERY.SUCCESS_TITLE'),
          this.translate.instant('RECOVERY.SUCCESS_DESC', { email: this.email }),
        );
      },
      error: (err) => {
        this.enviando = false;
        const errorMsg = err.error?.message || this.translate.instant('RECOVERY.ERROR_SEND');
        this.notifService.showError(
          this.translate.instant('RECOVERY.ERROR_TITLE'),
          errorMsg,
        );
        console.error('Error en recuperación:', err);
      },
    });
  }

  volverAlLogin() {
    this.router.navigate(['/login']);
  }
}