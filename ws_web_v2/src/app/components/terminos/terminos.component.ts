import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-terminos',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './terminos.component.html',
  styleUrl: './terminos.component.css',
})
export class TerminosComponent {
  lastUpdated = '01 de marzo de 2026';
}

// ── RUTA a añadir en app.routes.ts ──────────────────────────
// { path: 'terminos', component: TerminosComponent },