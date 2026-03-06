import { Component, OnInit, OnDestroy, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { LanguageSelectorComponent } from '../language-selector/language-selector.component';
import { TareasService } from '../../services/tareas/tareas.service';
import { ChecklistPreviewComponent } from '../checklist-preview/checklist-preview.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    LanguageSelectorComponent,
    ChecklistPreviewComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit, OnDestroy, AfterViewInit {
  showStickyNav    = false;
  mostrarPanel     = false;
  cargandoBoda     = false;

  // v2: Notificaciones pendientes de implementar
  notificaciones:        any[] = [];
  notificacionesSinLeer: number = 0;
  estadisticasChecklist: any = null;

  private checklistSub?: Subscription;

  constructor(
    public  authService:   AuthService,
    private router:        Router,
    private translate:     TranslateService,
    private tareasService: TareasService,
  ) {}

  ngOnInit() {
    // Sin sesión → mostrar home público sin redirigir.
    // Permite que el botón "Volver" del login lleve aquí sin bucles.
    if (!this.authService.isLoggedIn()) {
      return;
    }

    // Con sesión → verificar si tiene boda activa
    const weddingId = this.authService.getWeddingId();

    if (weddingId) {
      this.inicializarHome();
    } else {
      // Consultar API — solo redirige a onboarding si la lista viene vacía
      this.cargandoBoda = true;
      this.authService.loadActiveWedding().subscribe({
        next: (res: any) => {
          this.cargandoBoda = false;
          const lista: any[] = res?.data ?? res?.weddings ?? [];
          if (lista.length > 0) {
            this.authService.setWeddingId(lista[0].id);
            localStorage.setItem('weddingRole', lista[0].myRole ?? 'bride');
            this.inicializarHome();
          } else {
            this.router.navigate(['/onboarding']);
          }
        },
        error: () => {
          this.cargandoBoda = false;
          // 401 lo gestiona el interceptor → clearSession + /login
          // Otros errores: no redirigir para no romper navegación pública
        },
      });
    }
  }

  private inicializarHome() {
    if (this.authService.isWeddingOwner()) {
      this.cargarEstadisticasChecklist();
    }

    const userId  = this.authService.getUserId() || this.authService.getUserNick();
    const tourKey = `tourVisto_${userId}`;
    if (userId && !localStorage.getItem(tourKey)) {
      setTimeout(() => { this.iniciarTour(); localStorage.setItem(tourKey, 'true'); }, 1000);
    }
  }

  ngOnDestroy() { this.checklistSub?.unsubscribe(); }

  ngAfterViewInit() {
  }

  iniciarTour() {
    driver({
      showProgress: true, animate: true,
      popoverClass: 'driverjs-theme',
      overlayColor: 'rgba(51, 47, 44, 0.7)',
      stagePadding: 10,
      steps: [
        { element: '.nav-logo',      popover: { title: this.translate.instant('HOME.TOUR_STEP_1_TITLE'), description: this.translate.instant('HOME.TOUR_STEP_1_DESC'), side: 'bottom' } },
        { element: '.notif-wrapper', popover: { title: this.translate.instant('HOME.TOUR_STEP_2_TITLE'), description: this.translate.instant('HOME.TOUR_STEP_2_DESC'), side: 'bottom' } },
        { element: '.action-grid',   popover: { title: this.translate.instant('HOME.TOUR_STEP_3_TITLE'), description: this.translate.instant('HOME.TOUR_STEP_3_DESC'), side: 'top'    } },
        { element: '.logout-pill',   popover: { title: this.translate.instant('HOME.TOUR_STEP_4_TITLE'), description: this.translate.instant('HOME.TOUR_STEP_4_DESC'), side: 'left'   } },
      ],
    }).drive();
  }

  cargarEstadisticasChecklist() {
    const weddingId = this.authService.getWeddingId();
    if (!weddingId) return;
    this.tareasService.getChecklist(weddingId).subscribe({
      next: (res: any) => (this.estadisticasChecklist = res?.totals ?? res),
      error: ()        => (this.estadisticasChecklist = null),
    });
  }

  toggleNotificaciones() { this.mostrarPanel = !this.mostrarPanel; }
  leerNotificacion(n: any) { this.redirigirSegunTipo(n); }
  redirigirSegunTipo(n: any) {
    this.mostrarPanel = false;
    if (n.ruta) { this.router.navigate([n.ruta]); return; }
    const mapa: Record<string, string> = { foto: '/album', album: '/album', 'info-boda': '/info-boda', mesa: '/plano' };
    if (mapa[n.tipo]) this.router.navigate([mapa[n.tipo]]);
  }

  irAInfoBoda()  { this.router.navigate(['/info-boda']);        }
  irAMesas()     { this.router.navigate(['/mesa-manager']);     }
  irAPapeleria() { this.router.navigate(['/diseno-papeleria']); }
  verMiMesa()    { this.router.navigate(['/mi-asiento']);       }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.showStickyNav = (window.pageYOffset || document.documentElement.scrollTop) > 400;
    document.querySelectorAll('.reveal').forEach(el => {
      if (el.getBoundingClientRect().top < window.innerHeight - 150) el.classList.add('active');
    });
  }

  scrollToContent() {
    document.getElementById('marketing-content')?.scrollIntoView({ behavior: 'smooth' });
  }
}