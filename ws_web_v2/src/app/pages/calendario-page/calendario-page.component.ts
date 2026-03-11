// src/app/pages/calendario/calendario-page.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CalendarioComponent } from '../../components/calendario/calendario.component';
import { NotificationService } from '../../services/notification/notification.service';

@Component({
  selector: 'app-calendario-page',
  standalone: true,
  imports: [CommonModule, TranslateModule, CalendarioComponent],
  template: `
    <div class="page-wrapper">
      <app-calendario
        [weddingId]="weddingId"
        [weddingDate]="weddingDate"
        [weddingName]="weddingName"
        [planType]="planType">
      </app-calendario>
    </div>
  `,
  styles: [`
    .page-wrapper {
      max-width: 960px;
      margin: 0 auto;
      padding: 24px 16px;
    }
    @media (max-width: 640px) {
      .page-wrapper { padding: 12px 8px; }
    }
  `],
})
export class CalendarioPageComponent implements OnInit {
  weddingId: string = '';
  weddingDate: string | null = null;
  weddingName: string = 'Mi Boda';
  planType: string = 'free';

  constructor(
    private router: Router,
    private notifService: NotificationService,
  ) {}

  ngOnInit(): void {
    this.weddingId   = localStorage.getItem('weddingId')   ?? '';
    this.weddingDate = localStorage.getItem('weddingDate') ?? null;
    this.weddingName = localStorage.getItem('weddingName') ?? 'Mi Boda';
    this.planType    = localStorage.getItem('planType')    ?? 'free';

    if (!this.weddingId) {
      this.notifService.showError('Error', 'No hay boda seleccionada');
      this.router.navigate(['/home']);
    }
  }
}