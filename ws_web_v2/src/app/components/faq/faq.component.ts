import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FAQ_MAP } from '../../shared/faq';

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './faq.component.html',
  styleUrl: './faq.component.css',
})
export class FaqComponent implements OnInit {

  openIndex: string | null = null;

  faqCuenta:    { q: string; a: string }[] = [];
  faqBoda:      { q: string; a: string }[] = [];
  faqPlanes:    { q: string; a: string }[] = [];
  faqInvitados: { q: string; a: string }[] = [];

  constructor(private translate: TranslateService) {}

  ngOnInit() {
    this.loadFaq();

    // Recarga si el usuario cambia de idioma en caliente
    this.translate.onLangChange.subscribe(() => this.loadFaq());
  }

  private loadFaq() {
    const lang = this.translate.currentLang ?? this.translate.defaultLang ?? 'es';
    const faq  = FAQ_MAP[lang] ?? FAQ_MAP['es'];

    this.faqCuenta    = faq.cuenta;
    this.faqBoda      = faq.boda;
    this.faqPlanes    = faq.planes;
    this.faqInvitados = faq.invitados;
  }

  toggle(key: string) {
    this.openIndex = this.openIndex === key ? null : key;
  }
}