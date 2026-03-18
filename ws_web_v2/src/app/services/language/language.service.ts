import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly STORAGE_KEY = 'selected_language';
  private readonly DEFAULT_LANG = 'es';
  private readonly AVAILABLE_LANGS = ['es', 'en', 'fr', 'ca'];

  constructor(private translate: TranslateService) {
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
    return this.translate.currentLang || this.DEFAULT_LANG;
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
}