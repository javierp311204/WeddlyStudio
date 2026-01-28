import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../services/auth/auth.service';
import { NotificationService } from '../../services/notification/notification.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-album-digital',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './album-digital.component.html',
  styleUrl: './album-digital.component.css',
})
export class AlbumDigitalComponent implements OnInit {
  fotos: any[] = [];
  codigoBoda = '';
  private apiUrl = 'http://localhost:3000/api/album';

  constructor(
    private http: HttpClient,
    public authService: AuthService,
    private notifService: NotificationService,
    private router: Router
  ) {}

  ngOnInit() {
    this.codigoBoda = this.authService.getCodigoBoda();
    this.cargarFotos();
  }

  // Función privada para obtener los headers con el Token y evitar el error 401
  private getOptions() {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`
      })
    };
  }

onFileSelected(event: any) {
  const file: File = event.target.files[0];
  console.log("=== DEBUG ANGULAR ===");
  console.log("Archivo seleccionado:", file);
  console.log("Código de boda:", this.codigoBoda);
  console.log("Usuario:", this.authService.getUserNick());
  console.log("Token existe:", !!localStorage.getItem('token'));
  
  if (file) {
    const formData = new FormData();
    formData.append('imagen', file);
    formData.append('codigoBoda', this.codigoBoda);
    formData.append('usuario', this.authService.getUserNick());

    console.log("Enviando POST a:", `${this.apiUrl}/subir`);

    this.http.post(`${this.apiUrl}/subir`, formData, this.getOptions()).subscribe({
      next: (res: any) => {
        console.log("✅ Respuesta exitosa:", res);
        this.fotos = res.fotos;
        this.notifService.showSuccess('¡Subida!', 'Foto añadida al álbum.');
      },
      error: (err) => {
        console.error("❌ Error completo:", err);
        console.error("Status:", err.status);
        console.error("Message:", err.message);
        console.error("Error body:", err.error);
        this.notifService.showError('Error', 'No se pudo subir.');
      }
    });
  } else {
    console.log("❌ No se seleccionó ningún archivo");
  }
}

  cargarFotos() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`); //

    this.http.get<any>(`${this.apiUrl}/${this.codigoBoda}`, { headers })
      .subscribe({
        next: (res) => {
          // Importante: 'res' es el documento de la boda, las fotos están en 'res.fotos'
          this.fotos = res && res.fotos ? res.fotos : [];
        }
      });
  }

  irAlHome() {
    this.router.navigate(['/home']);
  }
}
