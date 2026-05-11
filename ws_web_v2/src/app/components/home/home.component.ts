import { Component, OnInit, OnDestroy, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../services/auth/auth.service';
import { IconComponent } from '../../shared/icons/icon.component';
import { LanguageSelectorComponent } from '../language-selector/language-selector.component';
import { SeoService } from '../../services/seo/seo.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    LanguageSelectorComponent,
    IconComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit, OnDestroy, AfterViewInit {

  showStickyNav = false;
  isMenuOpen = false;

  // Estadísticas sociales para el hero
  socialProofStats = [
    { number: '+12.000', label: 'bodas organizadas' },
    { number: '4.9★', label: 'valoración media' },
    { number: '2 min', label: 'para empezar' },
  ];

  // Features con routerLink opcional
  features = [
    {
      icon: 'invitados',
      titleKey: 'HOME.FEAT_GUESTS_TITLE',
      descKey: 'HOME.FEAT_GUESTS_DESC',
      items: ['HOME.FEAT_GUESTS_LI1', 'HOME.FEAT_GUESTS_LI2', 'HOME.FEAT_GUESTS_LI3'],
      route: '/wedding-guest-list-manager',
      highlight: false,
    },
    {
      icon: 'plano',
      titleKey: 'HOME.FEAT_TABLES_TITLE',
      descKey: 'HOME.FEAT_TABLES_DESC',
      items: ['HOME.FEAT_TABLES_LI1', 'HOME.FEAT_TABLES_LI2', 'HOME.FEAT_TABLES_LI3'],
      route: null,
      highlight: false,
    },
    {
      icon: 'checklist',
      titleKey: 'HOME.FEAT_CHECKLIST_TITLE',
      descKey: 'HOME.FEAT_CHECKLIST_DESC',
      items: ['HOME.FEAT_CHECKLIST_LI1', 'HOME.FEAT_CHECKLIST_LI2', 'HOME.FEAT_CHECKLIST_LI3'],
      route: '/wedding-checklist',
      highlight: false,
    },
    {
      icon: 'album',
      titleKey: 'HOME.FEAT_ALBUM_TITLE',
      descKey: 'HOME.FEAT_ALBUM_DESC',
      items: ['HOME.FEAT_ALBUM_LI1', 'HOME.FEAT_ALBUM_LI2', 'HOME.FEAT_ALBUM_LI3'],
      route: null,
      highlight: false,
    },
    {
      icon: 'diseno',
      titleKey: 'HOME.FEAT_DESIGN_TITLE',
      descKey: 'HOME.FEAT_DESIGN_DESC',
      items: ['HOME.FEAT_DESIGN_LI1', 'HOME.FEAT_DESIGN_LI2', 'HOME.FEAT_DESIGN_LI3'],
      route: null,
      highlight: false,
    },
    {
      icon: 'colaboradores',
      titleKey: 'HOME.FEAT_COLLAB_TITLE',
      descKey: 'HOME.FEAT_COLLAB_DESC',
      items: ['HOME.FEAT_COLLAB_LI1', 'HOME.FEAT_COLLAB_LI2', 'HOME.FEAT_COLLAB_LI3'],
      route: '/wedding-guest-list-manager',
      highlight: false,
    },
  ];

  // Planes de precios
  pricingPlans = [
    {
      badgeKey: 'HOME.PLAN_FREE_BADGE',
      icon: 'planGratuito',
      amount: '0€',
      periodKey: 'HOME.PLAN_FREE_PERIOD',
      taglineKey: 'HOME.PLAN_FREE_TAGLINE',
      annual: null,
      featured: false,
      popularKey: null,
      features: [
        { key: 'HOME.PLAN_FREE_F1', ok: true },
        { key: 'HOME.PLAN_FREE_F2', ok: true },
        { key: 'HOME.PLAN_FREE_F3', ok: true },
        { key: 'HOME.PLAN_FREE_F4', ok: true },
        { key: 'HOME.PLAN_FREE_F5', ok: false },
        { key: 'HOME.PLAN_FREE_F6', ok: false },
      ],
      ctaKey: 'HOME.PLAN_FREE_CTA',
      ctaStyle: 'outline',
    },
    {
      badgeKey: 'HOME.PLAN_PRO_BADGE',
      icon: 'planEsencial',
      amount: '49€',
      periodKey: 'HOME.PLAN_PRO_PERIOD',
      taglineKey: 'HOME.PLAN_PRO_TAGLINE',
      annual: null,
      featured: true,
      popularKey: 'HOME.PLAN_PRO_POPULAR',
      features: [
        { key: 'HOME.PLAN_PRO_F1', ok: true },
        { key: 'HOME.PLAN_PRO_F2', ok: true },
        { key: 'HOME.PLAN_PRO_F3', ok: true },
        { key: 'HOME.PLAN_PRO_F4', ok: true },
        { key: 'HOME.PLAN_PRO_F5', ok: true },
        { key: 'HOME.PLAN_PRO_F6', ok: true },
      ],
      ctaKey: 'HOME.PLAN_PRO_CTA',
      ctaStyle: 'gold',
    },
    {
      badgeKey: 'HOME.PLAN_PREMIUM_BADGE',
      icon: 'planPremium',
      amount: '14€',
      periodKey: 'HOME.PLAN_PREMIUM_PERIOD',
      taglineKey: 'HOME.PLAN_PREMIUM_TAGLINE',
      annual: 'HOME.PLAN_PREMIUM_ANNUAL',
      featured: false,
      popularKey: null,
      features: [
        { key: 'HOME.PLAN_PREMIUM_F1', ok: true },
        { key: 'HOME.PLAN_PREMIUM_F2', ok: true },
        { key: 'HOME.PLAN_PREMIUM_F3', ok: true },
        { key: 'HOME.PLAN_PREMIUM_F4', ok: true },
        { key: 'HOME.PLAN_PREMIUM_F5', ok: true },
        { key: 'HOME.PLAN_PREMIUM_F6', ok: true },
      ],
      ctaKey: 'HOME.PLAN_PREMIUM_CTA',
      ctaStyle: 'outline',
    },
  ];

  // Testimonios (ampliar con más en el futuro)
  testimonials = [
    {
      text: 'HOME.TESTIMONIAL_TEXT',
      author: 'HOME.TESTIMONIAL_AUTHOR',
      initials: 'L&C',
      rating: 5,
    },
    {
      text: 'HOME.TESTIMONIAL_2_TEXT',
      author: 'HOME.TESTIMONIAL_2_AUTHOR',
      initials: 'M&J',
      rating: 5,
    },
    {
      text: 'HOME.TESTIMONIAL_3_TEXT',
      author: 'HOME.TESTIMONIAL_3_AUTHOR',
      initials: 'A&P',
      rating: 5,
    },
  ];

  // Hero carousel
  heroSlides: string[] = [
    'https://weddly-photos-dev.s3.eu-west-1.amazonaws.com/landing/hero-1.jpg',
    'https://weddly-photos-dev.s3.eu-west-1.amazonaws.com/landing/hero-2.jpg',
    'https://weddly-photos-dev.s3.eu-west-1.amazonaws.com/landing/hero-3.jpg',
    'https://weddly-photos-dev.s3.eu-west-1.amazonaws.com/landing/hero-4.jpg',
    'https://weddly-photos-dev.s3.eu-west-1.amazonaws.com/landing/hero-5.jpg',
  ];
  currentSlide = 0;
  private slideInterval: any;

  // FAQ accordion
  openFaqIndex: number | null = null;

  faqItems = [
    { q: 'HOME.FAQ_Q1', a: 'HOME.FAQ_A1' },
    { q: 'HOME.FAQ_Q2', a: 'HOME.FAQ_A2' },
    { q: 'HOME.FAQ_Q3', a: 'HOME.FAQ_A3' },
    { q: 'HOME.FAQ_Q4', a: 'HOME.FAQ_A4' },
    { q: 'HOME.FAQ_Q5', a: 'HOME.FAQ_A5' },
  ];

  constructor(
    public  authService: AuthService,
    private seo:         SeoService,
  ) {}

  ngOnInit(): void {
    this.seo.set({
      title: 'Organiza tu Boda Online Gratis | Weddly Studio — Wedding Planner Digital',
      description: 'El wedding planner digital todo en uno: gestiona invitados, mesas, tareas, presupuesto y fotos de boda. Empieza gratis hoy y organiza la boda perfecta.',
      url: 'https://weddlystudio.uk/home',
    });

    this.onWindowScroll();
    this.startCarousel();
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    clearInterval(this.slideInterval);
  }

  // ─── Carousel ──────────────────────────────────────
  startCarousel(): void {
    this.slideInterval = setInterval(() => {
      this.currentSlide = (this.currentSlide + 1) % this.heroSlides.length;
    }, 5000);
  }

  goToSlide(index: number): void {
    this.currentSlide = index;
    clearInterval(this.slideInterval);
    this.startCarousel();
  }

  // ─── FAQ ───────────────────────────────────────────
  toggleFaq(index: number): void {
    this.openFaqIndex = this.openFaqIndex === index ? null : index;
  }

  // ─── Scroll ────────────────────────────────────────
  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.showStickyNav = (window.pageYOffset || document.documentElement.scrollTop) > 400;
    document.querySelectorAll('.reveal').forEach(el => {
      if (el.getBoundingClientRect().top < window.innerHeight - 100) {
        el.classList.add('active');
      }
    });
  }

  scrollToContent(): void {
    document.getElementById('marketing-content')?.scrollIntoView({ behavior: 'smooth' });
  }
}