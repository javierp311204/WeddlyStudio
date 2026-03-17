import { Component, OnInit, OnDestroy, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { IconComponent } from '../../shared/icons/icon.component';
import { TareasService } from '../../services/tareas/tareas.service';
import { ChecklistPreviewComponent } from '../checklist-preview/checklist-preview.component';
import { LanguageSelectorComponent } from '../language-selector/language-selector.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    LanguageSelectorComponent,
    IconComponent,
    ChecklistPreviewComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit, OnDestroy, AfterViewInit {

  // ─── Estado general ───────────────────────────────────────────
  showStickyNav    = false;
  mostrarPanel     = false;
  cargandoBoda     = false;
  mostrarBannerVerificacion = false;

  notificaciones:        any[] = [];
  notificacionesSinLeer: number = 0;
  estadisticasChecklist: any = null;

  private checklistSub?: Subscription;

  // ─── Hero carousel ────────────────────────────────────────────
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
    public  authService:   AuthService,
    private router:        Router,
    private translate:     TranslateService,
    private tareasService: TareasService,
    private route:         ActivatedRoute,
  ) {}

  // ─── Lifecycle ────────────────────────────────────────────────
  ngOnInit(): void {

      this.route.queryParams.subscribe(params => {
        if (params['verify_email'] === 'required') {
          setTimeout(() => {

            this.mostrarBannerVerificacion = true;
          }, 300);
        }
      });

    this.startCarousel();

    if (!this.authService.isLoggedIn()) return;

    const weddingId = this.authService.getWeddingId();

    if (weddingId) {
      this.inicializarHome();
    } else {
      this.cargandoBoda = true;
      this.authService.loadActiveWedding().subscribe({
        next: (res: any) => {
          this.cargandoBoda = false;
          const lista: any[] = res?.data ?? res?.weddings ?? [];
          if (lista.length > 0) {
            this.authService.setWeddingId(lista[0].id);
            this.authService.setWeddingStatus(lista[0].status ?? 'active');
            this.authService.setReadonlyReason(lista[0].readonly_reason ?? null);
            localStorage.setItem('weddingRole', lista[0].myRole ?? 'owner');
            this.inicializarHome();
          } else {
            this.authService.getMe().subscribe({
              next: (res: any) => {
                const user = res?.data ?? res;
                if (!user?.email_verified) {
                  this.mostrarBannerVerificacion = true; // mostrar banner aquí, no navegar
                } else {
                  this.router.navigate(['/onboarding']);
                }
              },
              error: () => this.router.navigate(['/onboarding'])
            });
          }
        },
        error: () => { this.cargandoBoda = false; },
      });
    }
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.checklistSub?.unsubscribe();
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

  // ─── Home init ────────────────────────────────────────────────
  private inicializarHome(): void {
    if (this.authService.isWeddingOwner()) {
      this.cargarEstadisticasChecklist();
    }

    const userId  = this.authService.getUserId() || this.authService.getUserNick();
    const tourKey = `tourVisto_${userId}`;
    if (userId && !localStorage.getItem(tourKey)) {
      setTimeout(() => { this.iniciarTour(); localStorage.setItem(tourKey, 'true'); }, 1000);
    }
  }

  iniciarTour(): void {
    driver({
      showProgress: true, animate: true,
      popoverClass: 'driverjs-theme',
      overlayColor: 'rgba(51, 47, 44, 0.7)',
      stagePadding: 10,
      steps: [
        { element: '.sidebar',     popover: { title: this.translate.instant('HOME.TOUR_STEP_1_TITLE'), description: this.translate.instant('HOME.TOUR_STEP_1_DESC'), side: 'right' } },
        { element: '.action-grid', popover: { title: this.translate.instant('HOME.TOUR_STEP_3_TITLE'), description: this.translate.instant('HOME.TOUR_STEP_3_DESC'), side: 'top'   } },
        { element: '.logout-btn',  popover: { title: this.translate.instant('HOME.TOUR_STEP_4_TITLE'), description: this.translate.instant('HOME.TOUR_STEP_4_DESC'), side: 'right' } },
      ],
    }).drive();
  }

  cargarEstadisticasChecklist(): void {
    const weddingId = this.authService.getWeddingId();
    if (!weddingId) return;
    this.tareasService.getChecklist(weddingId).subscribe({
      next: (res: any) => (this.estadisticasChecklist = res?.totals ?? res),
      error: ()        => (this.estadisticasChecklist = null),
    });
  }

  // ─── Notificaciones ───────────────────────────────────────────
  toggleNotificaciones(): void { this.mostrarPanel = !this.mostrarPanel; }
  leerNotificacion(n: any): void { this.redirigirSegunTipo(n); }

  redirigirSegunTipo(n: any): void {
    this.mostrarPanel = false;
    if (n.ruta) { this.router.navigate([n.ruta]); return; }
    const mapa: Record<string, string> = { foto: '/album', album: '/album', 'info-boda': '/info-boda', mesa: '/plano' };
    if (mapa[n.tipo]) this.router.navigate([mapa[n.tipo]]);
  }

  irAInfoBoda(): void { this.router.navigate(['/info-boda']); }

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