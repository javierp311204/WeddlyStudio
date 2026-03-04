import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

// ✅ Sin cambios para v2 — lee session_id de Stripe, redirige a /home

@Component({
  selector: 'app-pago-exitoso',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './pago-exitoso.component.html',
  styleUrl: './pago-exitoso.component.css',
})
export class PagoExitosoComponent implements OnInit {
  sessionId: string = '';

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.sessionId = this.route.snapshot.queryParamMap.get('session_id') || '';
    setTimeout(() => this.router.navigate(['/home']), 5000);
  }

  irAlHome() {
    this.router.navigate(['/home']);
  }
}