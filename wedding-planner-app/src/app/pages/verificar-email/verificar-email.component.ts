import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-verificar-email',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './verificar-email.component.html',
  styleUrl: './verificar-email.component.css'
})
export class VerificarEmailComponent implements OnInit {
  verificando: boolean = true;
  verificacionExitosa: boolean = false;
  mensajeError: string = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    // Obtener el token de la URL
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.verificando = false;
      this.mensajeError = 'Token de verificación no encontrado.';
      return;
    }

    // Llamar al backend para verificar
    this.verificarToken(token);
  }

  verificarToken(token: string) {
    this.http.get(`http://localhost:3000/api/auth/verificar-email/${token}`)
      .subscribe({
        next: (response: any) => {
          this.verificando = false;
          this.verificacionExitosa = true;
          
          // Redirigir al login después de 3 segundos
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        },
        error: (err) => {
          this.verificando = false;
          this.verificacionExitosa = false;
          this.mensajeError = err.error?.error || 'Error al verificar el email. El token puede haber expirado.';
        }
      });
  }

  irAlLogin() {
    this.router.navigate(['/login']);
  }
}