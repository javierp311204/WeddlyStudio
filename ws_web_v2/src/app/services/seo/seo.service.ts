// src/app/services/seo/seo.service.ts
//
// Uso en cualquier componente de página:
//
//   constructor(private seo: SeoService) {}
//
//   ngOnInit() {
//     this.seo.set({
//       title: 'Pricing | Weddly Studio',
//       description: 'Planes y precios de Weddly Studio...',
//       url: 'https://weddlystudio.uk/pricing',
//     });
//   }

import { Injectable } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { Router } from '@angular/router';

export interface SeoConfig {
  title: string;
  description: string;
  url?: string;
  image?: string;
  noIndex?: boolean;
}

// Valores por defecto — se usan si una página no llama a seo.set()
const DEFAULTS: SeoConfig = {
  title: 'Organiza tu Boda Online | Weddly Studio — Wedding Planner Digital',
  description: 'Planifica tu boda desde cero con Weddly Studio: gestiona invitados, mesas, tareas, presupuesto y álbum de fotos en un solo lugar. Gratis para empezar.',
  url: 'https://weddlystudio.uk/',
  image: 'https://weddlystudio.uk/assets/og-preview.png',
};

@Injectable({ providedIn: 'root' })
export class SeoService {
  constructor(
    private title: Title,
    private meta: Meta,
    private router: Router,
  ) {}

  set(config: Partial<SeoConfig>): void {
    const resolved: SeoConfig = { ...DEFAULTS, ...config };
    const canonicalUrl = resolved.url ?? `https://weddlystudio.uk${this.router.url}`;

    // Title
    this.title.setTitle(resolved.title);

    // Basic
    this.meta.updateTag({ name: 'description', content: resolved.description });
    this.meta.updateTag({
      name: 'robots',
      content: resolved.noIndex ? 'noindex, nofollow' : 'index, follow, max-snippet:-1, max-image-preview:large',
    });

    // Open Graph
    this.meta.updateTag({ property: 'og:title', content: resolved.title });
    this.meta.updateTag({ property: 'og:description', content: resolved.description });
    this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
    this.meta.updateTag({ property: 'og:image', content: resolved.image ?? DEFAULTS.image! });

    // Twitter
    this.meta.updateTag({ name: 'twitter:title', content: resolved.title });
    this.meta.updateTag({ name: 'twitter:description', content: resolved.description });
    this.meta.updateTag({ name: 'twitter:image', content: resolved.image ?? DEFAULTS.image! });
    this.meta.updateTag({ name: 'twitter:url', content: canonicalUrl });

    // Canonical — actualiza o crea el link
    this.updateCanonical(canonicalUrl);
  }

  // Resetea a los valores por defecto (útil en ngOnDestroy si lo necesitas)
  reset(): void {
    this.set(DEFAULTS);
  }

  updateHreflang(currentPath: string, currentLang: string): void {
    if (typeof document === 'undefined') {
      return;
    }

    const supportedLangs = ['es', 'en', 'fr', 'ca'];
    const normalizedPath = currentPath.startsWith('/') ? currentPath : `/${currentPath}`;
    const cleanedPath = normalizedPath.replace(/^\/(es|en|fr|ca)(?=\/|$)/, '') || '/';
    const pathSuffix = cleanedPath === '/' ? '/home' : cleanedPath;

    supportedLangs.forEach(lang => {
      const href = `https://weddlystudio.uk/${lang}${pathSuffix}`;
      const selector = `link[rel='alternate'][hreflang='${lang}']`;
      let alternate = document.querySelector<HTMLLinkElement>(selector);

      if (!alternate) {
        alternate = document.createElement('link');
        alternate.setAttribute('rel', 'alternate');
        alternate.setAttribute('hreflang', lang);
        document.head.appendChild(alternate);
      }

      alternate.setAttribute('href', href);
    });

    const xDefaultHref = cleanedPath === '/home' ? 'https://weddlystudio.uk/' : `https://weddlystudio.uk${cleanedPath}`;
    let xDefault = document.querySelector<HTMLLinkElement>("link[rel='alternate'][hreflang='x-default']");
    if (!xDefault) {
      xDefault = document.createElement('link');
      xDefault.setAttribute('rel', 'alternate');
      xDefault.setAttribute('hreflang', 'x-default');
      document.head.appendChild(xDefault);
    }
    xDefault.setAttribute('href', xDefaultHref);
  }

  private updateCanonical(url: string): void {
    // Solo funciona en browser; en SSR el canonical viene del index.html base
    if (typeof document === 'undefined') return;

    let link: HTMLLinkElement | null = document.querySelector("link[rel='canonical']");
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}