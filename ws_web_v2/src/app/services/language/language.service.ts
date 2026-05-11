import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly STORAGE_KEY = 'selected_language';
  private readonly DEFAULT_LANG = 'es';
  private readonly AVAILABLE_LANGS = ['es', 'en', 'fr', 'ca'];

  constructor(
    private translate: TranslateService,
    private router: Router,
  ) {
    this.translate.addLangs(this.AVAILABLE_LANGS);
    this.translate.setDefaultLang(this.DEFAULT_LANG);
  }

  initLanguage(): void {
    const savedLang = this.getSavedLanguage();
    const browserLang = this.translate.getBrowserLang();
    
    const langToUse = savedLang || 
                      (browserLang && this.AVAILABLE_LANGS.includes(browserLang) ? browserLang : null) || 
                      this.DEFAULT_LANG;
    
    this.setLanguage(langToUse);
  }

  setLanguage(lang: string): void {
    if (this.AVAILABLE_LANGS.includes(lang)) {
      this.translate.use(lang);
      localStorage.setItem(this.STORAGE_KEY, lang);
    }
  }

  getCurrentLanguage(): string {
    return localStorage.getItem(this.STORAGE_KEY) || this.DEFAULT_LANG;
  }

  onLanguageChange(): Observable<any> {
    return this.translate.onLangChange;
  }

  private getSavedLanguage(): string | null {
    return localStorage.getItem(this.STORAGE_KEY);
  }

  getAvailableLanguages(): string[] {
    return this.AVAILABLE_LANGS;
  }

  navigateToLang(lang: string): void {
    if (!this.AVAILABLE_LANGS.includes(lang)) {
      return;
    }

    const currentUrl = this.router.url;
    const urlTree = this.router.parseUrl(currentUrl);
    const segments = urlTree.root.children['primary']?.segments.map(segment => segment.path) ?? [];

    const hasLangPrefix = segments.length > 0 && this.AVAILABLE_LANGS.includes(segments[0]);
    const publicPaths = [
      'home',
      'pricing',
      'privacy',
      'terms',
      'faq',
      'support',
      'wedding-rsvp-tool',
      'wedding-seating-chart',
      'wedding-checklist',
      'wedding-guest-list-manager',
    ];

    let targetSegments: string[];

    if (hasLangPrefix) {
      const tail = segments.slice(1);
      if (tail.length === 0) {
        targetSegments = [lang, 'home'];
      } else if (publicPaths.includes(tail[0])) {
        targetSegments = [lang, ...tail];
      } else {
        this.setLanguage(lang);
        return;
      }
    } else if (segments.length === 0) {
      targetSegments = [lang, 'home'];
    } else if (publicPaths.includes(segments[0])) {
      targetSegments = [lang, ...segments];
    } else {
      this.setLanguage(lang);
      return;
    }

    const targetUrl = this.router.serializeUrl(
      this.router.createUrlTree(['/', ...targetSegments], {
        queryParams: urlTree.queryParams,
        fragment: urlTree.fragment ?? undefined,
      })
    );

    this.setLanguage(lang);
    this.router.navigateByUrl(targetUrl);
  }
}