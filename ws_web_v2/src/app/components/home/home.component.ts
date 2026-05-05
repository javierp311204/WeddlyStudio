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

  // ─── Carousel ────────────────────────────────────────────────
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

  // ─── Scroll ───────────────────────────────────────────────────
  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.showStickyNav = (window.pageYOffset || document.documentElement.scrollTop) > 400;
    document.querySelectorAll('.reveal').forEach(el => {
      if (el.getBoundingClientRect().top < window.innerHeight - 150) el.classList.add('active');
    });
  }

  scrollToContent(): void {
    document.getElementById('marketing-content')?.scrollIntoView({ behavior: 'smooth' });
  }
}