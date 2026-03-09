import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../services/language/language.service';

interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="lang-wrapper" [class.open]="isOpen">

      <button class="lang-trigger" (click)="toggle($event)" type="button">
        <span class="lang-flag">{{ currentLanguageOption.flag }}</span>
        <span class="lang-name">{{ currentLanguageOption.name }}</span>
        <svg class="lang-chevron" width="10" height="10" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      <ul class="lang-menu" *ngIf="isOpen">
        <li *ngFor="let lang of languages">
          <button
            class="lang-option"
            [class.selected]="currentLang === lang.code"
            (click)="changeLanguage(lang.code)"
            type="button">
            <span class="lang-flag">{{ lang.flag }}</span>
            <span>{{ lang.name }}</span>
            <span class="lang-check" *ngIf="currentLang === lang.code">✓</span>
          </button>
        </li>
      </ul>

    </div>
  `,
  styles: [`
    .lang-wrapper {
      position: relative;
      display: inline-block;
    }

    /* Trigger button */
    .lang-trigger {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 8px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(212, 163, 115, 0.2);
      border-radius: 8px;
      color: #a09080;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 0.82rem;
      cursor: pointer;
      transition: all 0.18s;
      white-space: nowrap;
    }

    .lang-trigger:hover,
    .open .lang-trigger {
      background: rgba(212, 163, 115, 0.1);
      border-color: rgba(212, 163, 115, 0.45);
      color: #d4a373;
    }

    .lang-flag  { font-size: 1rem; line-height: 1; }
    .lang-name  { font-size: 0.8rem; }

    .lang-chevron {
      transition: transform 0.2s;
      opacity: 0.6;
    }
    .open .lang-chevron { transform: rotate(180deg); }

    /* Dropdown menu — abre hacia ARRIBA para no salir del sidebar */
    .lang-menu {
      position: fixed;          /* fixed para salir del overflow:hidden del sidebar */
      bottom: 80px;             /* encima del footer del sidebar */
      left: 72px;               /* justo al lado del sidebar */
      min-width: 140px;
      background: #2a2420;
      border: 1px solid rgba(212, 163, 115, 0.2);
      border-radius: 10px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      list-style: none;
      margin: 0;
      padding: 4px;
      z-index: 2000;
      animation: fadeIn 0.15s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* Option buttons */
    .lang-option {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 8px 10px;
      background: transparent;
      border: none;
      border-radius: 7px;
      color: #8b7a6a;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 0.83rem;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
      text-align: left;
    }

    .lang-option:hover {
      background: rgba(212, 163, 115, 0.1);
      color: #d4a373;
    }

    .lang-option.selected {
      color: #d4a373;
      font-weight: 600;
    }

    .lang-check {
      margin-left: auto;
      color: #d4a373;
      font-size: 0.75rem;
    }
  `]
})
export class LanguageSelectorComponent implements OnInit {
  currentLang = 'es';
  isOpen      = false;

  languages: LanguageOption[] = [
    { code: 'es', name: 'Español',  flag: '🇪🇸' },
    { code: 'en', name: 'English',  flag: '🇺🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'ca', name: 'Català',   flag: '🏴󠁥󠁳󠁣󠁴󠁿' },
  ];

  constructor(
    private languageService: LanguageService,
    private elRef: ElementRef,
  ) {}

  ngOnInit(): void {
    this.currentLang = this.languageService.getCurrentLanguage();
    this.languageService.onLanguageChange().subscribe(event => {
      this.currentLang = event.lang;
    });
  }

  toggle(e: Event): void {
    e.stopPropagation();
    this.isOpen = !this.isOpen;
  }

  changeLanguage(lang: string): void {
    this.currentLang = lang;
    this.languageService.setLanguage(lang);
    this.isOpen = false;
  }

  /* Cierra al hacer click fuera */
  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(e.target)) {
      this.isOpen = false;
    }
  }

  get currentLanguageOption(): LanguageOption {
    return this.languages.find(l => l.code === this.currentLang) || this.languages[0];
  }
}