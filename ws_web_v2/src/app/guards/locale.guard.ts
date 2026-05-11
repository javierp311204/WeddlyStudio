import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LanguageService } from '../services/language/language.service';

const SUPPORTED_LANGS = ['es', 'en', 'fr', 'ca'];

const MARKETING_PATHS = new Set([
  'home',
  'pricing',
  'terms',
  'privacy',
  'faq',
  'support',
  'wedding-rsvp-tool',
  'wedding-seating-chart',
  'wedding-guest-list-manager',
  'wedding-checklist',
]);

// ── Detecta el idioma preferido sin tocar el router ──────────────────────────
function detectLang(): string {
  // 1. localStorage
  try {
    const saved = localStorage.getItem('selected_language');
    if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
  } catch {}

  // 2. navegador
  const browser = navigator.language?.split('-')[0]?.toLowerCase();
  if (browser && SUPPORTED_LANGS.includes(browser)) return browser;

  // 3. fallback
  return 'es';
}

// ─────────────────────────────────────────────────────────────────────────────
// localeGuard — valida que :lang sea un idioma soportado
// Si no lo es, redirige a /{defaultLang}/{resto}
// Si lo es, activa el idioma en TranslateService
// ─────────────────────────────────────────────────────────────────────────────
export const localeGuard: CanActivateFn = (route, state) => {
  const router          = inject(Router);
  const languageService = inject(LanguageService);

  const langParam = route.paramMap.get('lang')?.toLowerCase() ?? '';

  // Lang no soportado → redirigir conservando el resto de la URL
  if (!SUPPORTED_LANGS.includes(langParam)) {
    const fallbackLang = detectLang();
    const urlTree      = router.parseUrl(state.url);
    const segments     = urlTree.root.children['primary']?.segments.map(s => s.path) ?? [];
    const tail         = segments.slice(1); // descarta el :lang inválido

    return router.createUrlTree(
      tail.length > 0 ? ['/', fallbackLang, ...tail] : ['/', fallbackLang, 'home'],
      { queryParams: urlTree.queryParams, fragment: urlTree.fragment ?? undefined },
    );
  }

  // Lang válido → activar idioma y continuar
  languageService.setLanguage(langParam);
  return true;
};

// ─────────────────────────────────────────────────────────────────────────────
// rootLocaleRedirectGuard — solo para path ''
// Detecta idioma y redirige a /{lang}/home UNA sola vez
// ─────────────────────────────────────────────────────────────────────────────
export const rootLocaleRedirectGuard: CanActivateFn = (_, state) => {
  const router = inject(Router);
  const lang   = detectLang();

  const urlTree = router.parseUrl(state.url);

  return router.createUrlTree(
    ['/', lang, 'home'],
    { queryParams: urlTree.queryParams, fragment: urlTree.fragment ?? undefined },
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// marketingLocaleRedirectGuard — para rutas sin prefijo de idioma
// /home → /es/home (o el idioma guardado)
// ─────────────────────────────────────────────────────────────────────────────
export const marketingLocaleRedirectGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  const routePath = route.url.map(s => s.path).join('/');

  // Si la ruta no es de marketing, dejamos pasar (no debería ocurrir con el routing actual)
  if (!MARKETING_PATHS.has(routePath)) return true;

  const lang    = detectLang();
  const urlTree = router.parseUrl(state.url);

  return router.createUrlTree(
    ['/', lang, routePath],
    { queryParams: urlTree.queryParams, fragment: urlTree.fragment ?? undefined },
  );
};