import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-wedding-status-banner',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- Banner sticky superior -->
    <div class="status-banner status-banner--{{ status }}" *ngIf="status !== 'active'">
      <span class="status-banner__icon">{{ status === 'archived' ? '📦' : '⚠️' }}</span>
      <span class="status-banner__text">{{ bannerMessage }}</span>
      <a routerLink="/pricing" class="status-banner__cta">Ver planes →</a>
    </div>

    <!-- Overlay modal -->
    <div class="readonly-overlay" *ngIf="showOverlay">
      <div class="readonly-modal">
        <div class="readonly-modal__icon">{{ status === 'archived' ? '📦' : '🔒' }}</div>
        <h2 class="readonly-modal__title">{{ modalTitle }}</h2>
        <p class="readonly-modal__desc">{{ modalDesc }}</p>
        <div class="readonly-modal__actions">
          <a routerLink="/pricing" class="readonly-modal__btn readonly-modal__btn--primary">
            💎 Ver planes
          </a>
          <a routerLink="/dashboard" class="readonly-modal__btn readonly-modal__btn--secondary">
            ← Volver al inicio
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .status-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 20px;
      font-size: 0.875rem;
      font-weight: 500;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .status-banner--readonly { background: #fff3cd; color: #856404; border-bottom: 1px solid #ffc107; }
    .status-banner--archived { background: #e2e3e5; color: #383d41; border-bottom: 1px solid #ced4da; }
    .status-banner__cta {
      margin-left: auto;
      font-weight: 600;
      text-decoration: underline;
      color: inherit;
      white-space: nowrap;
    }

    .readonly-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(3px);
      z-index: 999;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .readonly-modal {
      background: #fff;
      border-radius: 16px;
      padding: 48px 40px;
      max-width: 480px;
      width: 90%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    }
    .readonly-modal__icon { font-size: 3rem; margin-bottom: 16px; }
    .readonly-modal__title {
      font-family: 'Playfair Display', serif;
      font-size: 1.5rem;
      font-weight: 700;
      color: #2b2724;
      margin-bottom: 12px;
    }
    .readonly-modal__desc {
      color: #6c757d;
      font-size: 0.95rem;
      line-height: 1.6;
      margin-bottom: 32px;
    }
    .readonly-modal__actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .readonly-modal__btn {
      padding: 12px 24px;
      border-radius: 50px;
      font-weight: 600;
      font-size: 0.9rem;
      text-decoration: none;
      transition: opacity 0.2s;
    }
    .readonly-modal__btn:hover { opacity: 0.85; }
    .readonly-modal__btn--primary  { background: #c9a96e; color: #fff; }
    .readonly-modal__btn--secondary { background: #f0ece8; color: #2b2724; }
  `],
})
export class WeddingStatusBannerComponent implements OnInit {
  status      = 'active';
  showOverlay = false;

  bannerMessage = '';
  modalTitle    = '';
  modalDesc     = '';

  constructor(
    private authService: AuthService,
    private router:      Router,       // ← añadido
  ) {}

  ngOnInit(): void {
    this.status = this.authService.getWeddingStatus();
    this.updateMessages();
    this.checkOverlay(window.location.pathname);

    // Re-evaluar en cada navegación
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      this.checkOverlay(e.urlAfterRedirects);
    });
  }

  private checkOverlay(path: string): void {
    const blockedPaths = [
      '/checklist', '/info-boda', '/invitados',
      '/mesas', '/plano', '/diseno', '/colaboradores',
    ];
    const isBlockedRoute = blockedPaths.some(p => path.startsWith(p));

    // readonly → solo banner, puede entrar y ver
    // archived → overlay completo, no puede entrar
    this.showOverlay = isBlockedRoute && this.status === 'archived';
  }

  private updateMessages(): void {
    const reason = this.authService.getReadonlyReason();

    if (this.status === 'readonly') {
      if (reason === 'payment_failed') {
        this.bannerMessage = 'Tu suscripción tiene un problema de pago. La boda está en modo lectura.';
        this.modalTitle    = 'Problema con tu suscripción';
        this.modalDesc     = 'Tu suscripción ha caducado o hay un pago pendiente. Renueva tu plan para volver a editar.';
      } else {
        // wedding_completed
        this.bannerMessage = '¡Tu boda ya se celebró! Estás en modo recuerdo, solo lectura.';
        this.modalTitle    = 'Modo recuerdo 💍';
        this.modalDesc     = 'La boda ya ocurrió. Puedes consultar invitados, fotos y cronograma, pero no realizar cambios.';
      }
    } else if (this.status === 'archived') {
      this.bannerMessage = 'Esta boda está archivada.';
      this.modalTitle    = 'Boda archivada';
      this.modalDesc     = 'Esta boda está archivada y no admite cambios. Puedes desarchivarla desde "Mis Bodas" si tu plan lo permite.';
    }
  }
}