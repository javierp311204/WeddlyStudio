import { Component, OnInit } from '@angular/core';
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
    <div class="dropdown">
      <button 
        class="btn btn-outline-secondary dropdown-toggle d-flex align-items-center gap-2 rounded-3" 
        type="button" 
        id="languageDropdown" 
        data-bs-toggle="dropdown" 
        aria-expanded="false">
        <span class="flag-icon">{{ currentLanguageOption.flag }}</span>
        <span class="d-none d-md-inline">{{ currentLanguageOption.name }}</span>
      </button>
      <ul class="dropdown-menu dropdown-menu-end shadow rounded-3" aria-labelledby="languageDropdown">
        <li *ngFor="let lang of languages">
          <a 
            class="dropdown-item d-flex align-items-center gap-2 py-2" 
            [class.active]="currentLang === lang.code"
            (click)="changeLanguage(lang.code)"
            style="cursor: pointer;">
            <span class="flag-icon">{{ lang.flag }}</span>
            <span>{{ lang.name }}</span>
            <span class="ms-auto" *ngIf="currentLang === lang.code">✓</span>
          </a>
        </li>
      </ul>
    </div>
  `,
  styles: [`
    .flag-icon {
      font-size: 1.25rem;
      line-height: 1;
    }

    .dropdown-item {
      transition: all 0.2s ease;
    }

    .dropdown-item:hover {
      background-color: rgba(212, 163, 115, 0.1);
      color: #d4a373;
    }

    .dropdown-item.active {
      background-color: rgba(212, 163, 115, 0.15);
      color: #d4a373;
      font-weight: 600;
    }

    .btn {
      min-width: 120px;
    }

    @media (max-width: 768px) {
      .btn {
        min-width: auto;
        padding: 0.5rem 0.75rem;
      }
    }
  `]
})
export class LanguageSelectorComponent implements OnInit {
  currentLang: string = 'es';
  
  languages: LanguageOption[] = [
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'en', name: 'English', flag: '🇺🇸' }
  ];

  constructor(private languageService: LanguageService) {}

ngOnInit(): void {
  this.currentLang = this.languageService.getCurrentLanguage();
  
  // Aquí está el cambio: accedemos a event.lang
  this.languageService.onLanguageChange().subscribe(event => {
    this.currentLang = event.lang; 
  });
}

  changeLanguage(lang: string): void {
    this.currentLang = lang;
    this.languageService.setLanguage(lang);
  }

  get currentLanguageOption(): LanguageOption {
    return this.languages.find(l => l.code === this.currentLang) || this.languages[0];
  }

  
}