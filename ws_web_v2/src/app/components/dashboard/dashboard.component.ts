import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { AuthService } from '../../services/auth/auth.service';
import { IconComponent } from '../../shared/icons/icon.component';
import { TareasService } from '../../services/tareas/tareas.service';
import { ChecklistPreviewComponent } from '../checklist-preview/checklist-preview.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    IconComponent,
    ChecklistPreviewComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit, OnDestroy {

  mostrarBannerVerificacion = false;
  cargandoBoda              = false;
  estadisticasChecklist: any = null;

  private checklistSub?: Subscription;

  constructor(
    public  authService:   AuthService,
    private router:        Router,
    private route:         ActivatedRoute,
    private translate:     TranslateService,
    private tareasService: TareasService,
  ) {}

  ngOnInit(): void {
    // Banner de email no verificado via query param
    this.route.queryParams.subscribe(params => {
      if (params['verify_email'] === 'required') {
        setTimeout(() => { this.mostrarBannerVerificacion = true; }, 300);
      }
    });

    const weddingId = this.authService.getWeddingId();

    if (weddingId) {
      this.inicializarDashboard();
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
            this.inicializarDashboard();
          } else {
            // Sin boda: comprobar si el email está verificado
            this.authService.getMe().subscribe({
              next: (res: any) => {
                const user = res?.data ?? res;
                if (!user?.email_verified) {
                  this.mostrarBannerVerificacion = true;
                } else {
                  this.router.navigate(['/onboarding']);
                }
              },
              error: () => this.router.navigate(['/onboarding']),
            });
          }
        },
        error: () => { this.cargandoBoda = false; },
      });
    }
  }

  ngOnDestroy(): void {
    this.checklistSub?.unsubscribe();
  }

  // ─── Inicialización ──────────────────────────────────────────
  private inicializarDashboard(): void {
    if (this.authService.isWeddingOwner()) {
      this.cargarEstadisticasChecklist();
    }

    const userId  = this.authService.getUserId() || this.authService.getUserNick();
    const tourKey = `tourVisto_${userId}`;
    if (userId && !localStorage.getItem(tourKey)) {
      setTimeout(() => {
        this.iniciarTour();
        localStorage.setItem(tourKey, 'true');
      }, 1000);
    }
  }

  // ─── Tour ────────────────────────────────────────────────────
  iniciarTour(): void {
    driver({
      showProgress: true,
      animate: true,
      popoverClass: 'driverjs-theme',
      overlayColor: 'rgba(51, 47, 44, 0.7)',
      stagePadding: 10,
      steps: [
        {
          element: '.sidebar',
          popover: {
            title: this.translate.instant('HOME.TOUR_STEP_1_TITLE'),
            description: this.translate.instant('HOME.TOUR_STEP_1_DESC'),
            side: 'right',
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
          element: '.logout-btn',
          popover: {
            title: this.translate.instant('HOME.TOUR_STEP_4_TITLE'),
            description: this.translate.instant('HOME.TOUR_STEP_4_DESC'),
            side: 'right',
          },
        },
      ],
    }).drive();
  }

  // ─── Checklist ───────────────────────────────────────────────
  cargarEstadisticasChecklist(): void {
    const weddingId = this.authService.getWeddingId();
    if (!weddingId) return;
    this.tareasService.getChecklist(weddingId).subscribe({
      next: (res: any) => (this.estadisticasChecklist = res?.totals ?? res),
      error: ()        => (this.estadisticasChecklist = null),
    });
  }
}