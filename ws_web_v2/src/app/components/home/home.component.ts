import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HostListener } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { interval, Subscription } from 'rxjs';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { LanguageSelectorComponent } from '../language-selector/language-selector.component';
import { TareasService } from '../../services/tareas/tareas.service';
import { ChecklistPreviewComponent } from '../checklist-preview/checklist-preview.component';

// ─────────────────────────────────────────────────────────────
// MIGRACIÓN v2:
//  • codigoBoda      → weddingId (UUID desde localStorage)
//  • usuarioNick     → se obtiene desde authService (first_name/email)
//  • tipoUsuario     → globalRole del JWT ('user'|'admin'|'superadmin')
//  • NotificacionesService → ⚠️ NO implementado en v2. Se elimina la carga
//    automática de notificaciones y el panel. El UI permanece pero vacío.
//  • authService.isAdmin() → authService.isAdmin() (mantener si el servicio
//    lo adapta; internamente debe leer globalRole del JWT v2)
//  • authService.getCodigoBoda() → authService.getWeddingId()
//  • cargarEstadisticasChecklist() usa weddingId
// ─────────────────────────────────────────────────────────────

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    LanguageSelectorComponent,
    ChecklistPreviewComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  showStickyNav = false;

  mostrarPanel: boolean = false;

  // ⚠️ v2: Notificaciones no implementadas — arrays vacíos hasta que se implemente
  notificaciones: any[] = [];
  notificacionesSinLeer: number = 0;

  estadisticasChecklist: any = null;

  private checklistSub?: Subscription;

  constructor(
    public authService: AuthService,
    private router: Router,
    private translate: TranslateService,
    private tareasService: TareasService,
  ) {}

  ngOnInit() {
    // ⚠️ v2: NotificacionesService no implementado — se omite la carga
    // this.cargarNotificaciones();
    // this.notifSubscription = interval(30000).subscribe(...)

    if (this.authService.isAdmin()) {
      this.cargarEstadisticasChecklist();
    }
  }

  ngOnDestroy() {
    this.checklistSub?.unsubscribe();
  }

  iniciarTour() {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      popoverClass: 'driverjs-theme',
      overlayColor: 'rgba(51, 47, 44, 0.7)',
      stagePadding: 10,
      steps: [
        {
          element: '.nav-logo',
          popover: {
            title: this.translate.instant('HOME.TOUR_STEP_1_TITLE'),
            description: this.translate.instant('HOME.TOUR_STEP_1_DESC'),
            side: 'bottom',
          },
        },
        {
          element: '.notif-wrapper',
          popover: {
            title: this.translate.instant('HOME.TOUR_STEP_2_TITLE'),
            description: this.translate.instant('HOME.TOUR_STEP_2_DESC'),
            side: 'bottom',
          },
        },
        {
          element: '.action-grid',
          popover: {
            title: this.translate.instant('HOME.TOUR_STEP_3_TITLE'),
            description: this.translate.instant('HOME.TOUR_STEP_3_DESC'),
            side: 'top',
          },
        },
        {
          element: '.logout-pill',
          popover: {
            title: this.translate.instant('HOME.TOUR_STEP_4_TITLE'),
            description: this.translate.instant('HOME.TOUR_STEP_4_DESC'),
            side: 'left',
          },
        },
      ],
    });

    driverObj.drive();
  }

  ngAfterViewInit() {
    // v2: clave del tour basada en el user id/email del token
    const userId = this.authService.getUserId?.() || this.authService.getUserNick?.();
    const tourKey = `tourVisto_${userId}`;
    const yaVisto = localStorage.getItem(tourKey);

    if (userId && !yaVisto) {
      setTimeout(() => {
        this.iniciarTour();
        localStorage.setItem(tourKey, 'true');
      }, 1000);
    }
  }

  // ⚠️ v2: Notificaciones no implementadas — método vacío hasta que se implemente
  cargarNotificaciones() {
    console.warn('cargarNotificaciones: NotificacionesService no implementado en API v2');
  }

  toggleNotificaciones() {
    this.mostrarPanel = !this.mostrarPanel;
  }

  // ⚠️ v2: sin servicio de notificaciones real
  leerNotificacion(n: any) {
    this.redirigirSegunTipo(n);
  }

  redirigirSegunTipo(notificacion: any) {
    this.mostrarPanel = false;

    if (notificacion.ruta) {
      this.router.navigate([notificacion.ruta]);
      return;
    }

    switch (notificacion.tipo) {
      case 'foto':
      case 'album':
        this.router.navigate(['/album']);
        break;
      case 'info-boda':
        this.router.navigate(['/info-boda']);
        break;
      case 'mesa':
        this.router.navigate(['/plano']);
        break;
    }
  }

  cargarEstadisticasChecklist() {
    // v2: usar weddingId (UUID)
    const weddingId = localStorage.getItem('weddingId') || '';
    if (!weddingId) return;

    // v2: GET /api/weddings/:weddingId/tasks devuelve { tasks, grouped, totals }
    this.tareasService.getChecklist(weddingId).subscribe({
      next: (res: any) => (this.estadisticasChecklist = res?.totals ?? res),
      error: () => (this.estadisticasChecklist = null),
    });
  }

  irAInfoBoda() { this.router.navigate(['/info-boda']); }
  irAMesas()    { this.router.navigate(['/mesa-manager']); }
  irAPapeleria(){ this.router.navigate(['/diseno-papeleria']); }
  verMiMesa()   { this.router.navigate(['/mi-asiento']); }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollOffset = window.pageYOffset || document.documentElement.scrollTop;
    this.showStickyNav = scrollOffset > 400;

    document.querySelectorAll('.reveal').forEach((el) => {
      const top = el.getBoundingClientRect().top;
      if (top < window.innerHeight - 150) el.classList.add('active');
    });
  }

  scrollToContent() {
    document.getElementById('marketing-content')?.scrollIntoView({ behavior: 'smooth' });
  }
}