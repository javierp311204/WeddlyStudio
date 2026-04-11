import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IconComponent } from '../../shared/icons/icon.component';

@Component({
  selector: 'app-soporte',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule, IconComponent],
  templateUrl: './soporte.component.html',
  styleUrl: './soporte.component.css',
})
export class SoporteComponent {

  form = {
    nombre: '',
    email: '',
    asunto: '',
    mensaje: '',
  };

  enviando = false;
  enviado  = false;
  error    = '';

  private FORMSPREE_URL = 'https://formspree.io/f/xbdpnjbg';

  constructor(
    private http: HttpClient,
    private translate: TranslateService,
  ) {}

  enviar() {
    if (!this.form.nombre || !this.form.email || !this.form.asunto || !this.form.mensaje) {
      this.error = this.translate.instant('SOPORTE.ERROR_REQUIRED');
      return;
    }

    this.enviando = true;
    this.error    = '';

    const headers = new HttpHeaders({ Accept: 'application/json' });

    const payload = {
      name:    this.form.nombre,
      email:   this.form.email,
      subject: this.form.asunto,
      message: this.form.mensaje,
    };

    this.http.post(this.FORMSPREE_URL, payload, { headers }).subscribe({
      next: () => {
        this.enviando = false;
        this.enviado  = true;
      },
      error: () => {
        this.enviando = false;
        this.error = this.translate.instant('SOPORTE.ERROR_SEND');
      },
    });
  }

  resetForm() {
    this.enviado = false;
    this.form    = { nombre: '', email: '', asunto: '', mensaje: '' };
    this.error   = '';
  }
}