import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-pago-exitoso',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './pago-exitoso.component.html',
  styleUrl: './pago-exitoso.component.css',
})
export class PagoExitosoComponent implements OnInit {
  sessionId = '';

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.sessionId = this.route.snapshot.queryParamMap.get('session_id') || '';
    // Redirige a /dashboard (no a /home) tras 5 segundos
    setTimeout(() => this.router.navigate(['/dashboard']), 5000);
  }

  irAlDashboard() {
    this.router.navigate(['/dashboard']);
  }
}