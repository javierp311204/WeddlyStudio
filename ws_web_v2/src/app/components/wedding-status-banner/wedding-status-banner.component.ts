import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth/auth.service';
import { filter } from 'rxjs/operators';
import { IconComponent } from '../../shared/icons/icon.component';

@Component({
  selector: 'app-wedding-status-banner',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, IconComponent],
  template: `
    <!-- Banner sticky superior -->
    <div class="status-banner status-banner--{{ status }}" *ngIf="status !== 'active'">
      <app-icon [name]="status === 'archived' ? 'archive' : 'advertencia'" [size]="16" class="status-banner__icon"></app-icon>
      <span class="status-banner__text">{{ bannerMessage }}</span>
      <a routerLink="/pricing" class="status-banner__cta">
        {{ 'WEDDING_STATUS.BANNER_SEE_PLANS' | translate }}
      </a>
    </div>

    <!-- Overlay modal -->
    <div class="readonly-overlay" *ngIf="showOverlay">
      <div class="readonly-modal">
        <div class="readonly-modal__icon">
          <app-icon [name]="status === 'archived' ? 'archive' : 'lock'" [size]="55"></app-icon>
        </div>
        <h2 class="readonly-modal__title">{{ modalTitle }}</h2>
        <p class="readonly-modal__desc">{{ modalDesc }}</p>
        <div class="readonly-modal__actions">
          <a routerLink="/pricing" class="readonly-modal__btn readonly-modal__btn--primary">
            {{ 'WEDDING_STATUS.MODAL_BTN_PLANS' | translate }}
          </a>
          <a routerLink="/dashboard" class="readonly-modal__btn readonly-modal__btn--secondary">
            {{ 'WEDDING_STATUS.MODAL_BTN_BACK' | translate }}
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
    .status-banner__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      line-height: 1;
    }
    .status-banner__icon app-icon {
      display: flex;
      align-items: center;
      justify-content: center;
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
    private router:      Router,
    private translate:   TranslateService,
  ) {}

  ngOnInit(): void {
    this.status = this.authService.getWeddingStatus();
    this.updateMessages();
    this.checkOverlay(window.location.pathname);

    // Re-evaluar en cada navegación
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      this.status = this.authService.getWeddingStatus();
      this.updateMessages();
      this.checkOverlay(e.urlAfterRedirects);
    });

    // Re-evaluar cuando cambie el idioma
    this.translate.onLangChange.subscribe(() => {
      this.updateMessages();
    });
  }

  private checkOverlay(path: string): void {
    const blockedPaths = [
      '/checklist', '/info-boda', '/invitados',
      '/mesas', '/plano', '/diseno', '/colaboradores',
    ];
    const isBlockedRoute = blockedPaths.some(p => path.startsWith(p));
    this.showOverlay = isBlockedRoute && this.status === 'archived';
  }

  private updateMessages(): void {
    const reason = this.authService.getReadonlyReason();

    if (this.status === 'readonly') {
      if (reason === 'payment_failed') {
        this.bannerMessage = this.translate.instant('WEDDING_STATUS.BANNER_READONLY_PAYMENT');
        this.modalTitle    = this.translate.instant('WEDDING_STATUS.MODAL_PAYMENT_TITLE');
        this.modalDesc     = this.translate.instant('WEDDING_STATUS.MODAL_PAYMENT_DESC');
      } else {
        this.bannerMessage = this.translate.instant('WEDDING_STATUS.BANNER_READONLY_COMPLETED');
        this.modalTitle    = this.translate.instant('WEDDING_STATUS.MODAL_COMPLETED_TITLE');
        this.modalDesc     = this.translate.instant('WEDDING_STATUS.MODAL_COMPLETED_DESC');
      }
    } else if (this.status === 'archived') {
      this.bannerMessage = this.translate.instant('WEDDING_STATUS.BANNER_ARCHIVED');
      this.modalTitle    = this.translate.instant('WEDDING_STATUS.MODAL_ARCHIVED_TITLE');
      this.modalDesc     = this.translate.instant('WEDDING_STATUS.MODAL_ARCHIVED_DESC');
    }
  }
}