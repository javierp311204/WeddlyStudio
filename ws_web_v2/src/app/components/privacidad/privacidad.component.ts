import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-privacidad',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './privacidad.component.html',
  styleUrl: '../terminos/terminos.component.css',
})
export class PrivacidadComponent {
  lastUpdated = '01 de marzo de 2026';
}

// ── RUTA a añadir en app.routes.ts ──────────────────────────
// { path: 'privacidad', component: PrivacidadComponent }