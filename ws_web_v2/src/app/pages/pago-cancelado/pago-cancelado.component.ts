import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-pago-cancelado',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './pago-cancelado.component.html',
  styleUrl: './pago-cancelado.component.css'
})
export class PagoCanceladoComponent {
  constructor(
    private router: Router,
    private translate: TranslateService
  ) {}

  irAPricing() {
    this.router.navigate(['/pricing']);
  }

  irAlDashboard() {
    this.router.navigate(['/dashboard']);
  }
}