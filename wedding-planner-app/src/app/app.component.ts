import { Component } from '@angular/core';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth/auth.service';
import { NotificationService } from './services/notification/notification.service';
import { PlanLimitsWidgetComponent } from './components/plan-limits-widget/plan-limits-widget.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterModule, CommonModule, PlanLimitsWidgetComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})

export class AppComponent {
  title = 'wedding-planner-app';

  constructor(public authService: AuthService, public notifService: NotificationService, private router: Router) {}

  salir() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
