import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pago-cancelado',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cancel-wrapper">
      <div class="cancel-card">
        <div class="cancel-icon">❌</div>
        <h1>Pago cancelado</h1>
        <p>No se ha realizado ningún cargo. Puedes intentarlo de nuevo cuando quieras.</p>
        <button (click)="irAPricing()">Ver planes</button>
        <button class="ghost" (click)="irAlDashboard()">Volver al panel</button>
      </div>
    </div>
  `,
  styles: [`
    .cancel-wrapper { min-height:100vh; display:flex; align-items:center; justify-content:center; background:#faf8f5; }
    .cancel-card { background:white; border-radius:24px; padding:48px 40px; text-align:center; max-width:440px; box-shadow:0 8px 32px rgba(0,0,0,0.08); }
    .cancel-icon { font-size:3rem; margin-bottom:16px; }
    h1 { font-family:'Playfair Display',serif; font-size:1.8rem; color:#2C2420; margin-bottom:12px; }
    p { color:#8B7E74; margin-bottom:28px; line-height:1.6; }
    button { width:100%; padding:14px; border-radius:12px; border:none; background:#C9A96E; color:white; font-size:0.95rem; font-weight:600; cursor:pointer; margin-bottom:10px; }
    button.ghost { background:transparent; color:#8B7E74; border:1.5px solid #D4C9BE; }
  `]
})
export class PagoCanceladoComponent {
  constructor(private router: Router) {}
  irAPricing()    { this.router.navigate(['/pricing']); }
  irAlDashboard() { this.router.navigate(['/dashboard']); }
}