// src/app/components/notfound404/notfound404.component.ts

import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo/seo.service';

@Component({
  selector: 'app-notfound404',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="nf-wrap" role="main" aria-labelledby="nf-title">
      <div class="nf-content">
        <span class="nf-code" aria-hidden="true">404</span>
        <h1 id="nf-title" class="nf-title">Página no encontrada</h1>
        <p class="nf-desc">
          Esta página no existe o ha sido movida.<br>
          Vuelve al inicio y sigue organizando vuestra boda.
        </p>
        <a routerLink="/home" class="nf-btn">Volver al inicio</a>
      </div>
    </main>
  `,
  styles: [`
    .nf-wrap {
      min-height: 70vh;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 2rem;
    }
    .nf-content { max-width: 420px; }
    .nf-code {
      display: block;
      font-size: 80px;
      font-weight: 700;
      color: #8B6F47;
      line-height: 1;
      margin-bottom: 1rem;
      font-family: 'Playfair Display', serif;
    }
    .nf-title {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 0.75rem;
    }
    .nf-desc {
      color: #6b7280;
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }
    .nf-btn {
      display: inline-block;
      padding: 0.65rem 1.5rem;
      background: #8B6F47;
      color: #fff;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
      transition: background 0.2s;
    }
    .nf-btn:hover { background: #7a5f3a; }
  `]
})
export class NotFoundComponent implements OnInit {
  constructor(private seo: SeoService) {}

  ngOnInit(): void {
    this.seo.set({
      title: 'Página no encontrada | Weddly Studio',
      description: 'Esta página no existe. Vuelve al inicio de Weddly Studio.',
      noIndex: true,
    });
  }
}