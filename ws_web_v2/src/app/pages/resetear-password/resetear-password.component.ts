import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NotificationService } from '../../services/notification/notification.service';
import { IconComponent } from '../../shared/icons/icon.component';

@Component({
  selector: 'app-resetear-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule, IconComponent],
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
    private translate: TranslateService,
  ) {}

  ngOnInit() {
    const tokenParam = this.route.snapshot.queryParamMap.get('token');

    if (!tokenParam) {
      this.tokenInvalido = true;
      this.mensajeError = this.translate.instant('PASSWORD_RESET.ERROR_INVALID');
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
      this.notifService.showError(
        this.translate.instant('PASSWORD_RESET.ERROR_TITLE'),
        this.translate.instant('PASSWORD_RESET.ERROR_SHORT')
      );
      return;
    }
    if (this.nuevaPassword.length < 8) {
      this.notifService.showError(
        this.translate.instant('PASSWORD_RESET.ERROR_TITLE'),
        this.translate.instant('PASSWORD_RESET.ERROR_SHORT')
      );
      return;
    }
    if (this.nuevaPassword !== this.confirmarPassword) {
      this.notifService.showError(
        this.translate.instant('PASSWORD_RESET.ERROR_TITLE'),
        this.translate.instant('PASSWORD_RESET.ERROR_MISMATCH')
      );
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
          this.translate.instant('PASSWORD_RESET.SUCCESS_TITLE'),
          this.translate.instant('PASSWORD_RESET.SUCCESS_DESC'),
        );
        setTimeout(() => this.router.navigate(['/login']), 3000);
      },
      error: (err) => {
        this.procesando = false;
        const mensaje =
          err.error?.message ||
          err.error?.error ||
          this.translate.instant('PASSWORD_RESET.ERROR_INVALID');
        this.notifService.showError(
          this.translate.instant('PASSWORD_RESET.ERROR_TITLE'),
          mensaje
        );

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