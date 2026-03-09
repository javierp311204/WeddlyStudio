import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-verificar-email',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './verificar-email.component.html',
  styleUrl: './verificar-email.component.css',
})
export class VerificarEmailComponent implements OnInit {
  verificando: boolean = true;
  verificacionExitosa: boolean = false;
  mensajeError: string = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private translate: TranslateService,
  ) {}

  ngOnInit() {
    // v2: el token viene como path param /:token
    const token = this.route.snapshot.paramMap.get('token');

    if (!token) {
      this.verificando = false;
      this.mensajeError = this.translate.instant('VERIFICATION.ERROR_GENERAL');
      return;
    }

    this.verificarToken(token);
  }

  verificarToken(token: string) {
    // v2: GET /api/auth/verify-email/:token
    this.http.get(`http://localhost:3000/api/auth/verify-email/${token}`).subscribe({
      next: () => {
        this.verificando = false;
        this.verificacionExitosa = true;
        // Redirige al login tras 3 segundos
        setTimeout(() => this.router.navigate(['/login'], {
          queryParams: { verified: 'true' }
        }), 3000);
      },
      error: (err) => {
        this.verificando = false;
        this.verificacionExitosa = false;
        this.mensajeError =
          err.error?.message ?? this.translate.instant('VERIFICATION.ERROR_GENERAL');
      },
    });
  }

  irAlLogin() {
    this.router.navigate(['/login']);
  }
}