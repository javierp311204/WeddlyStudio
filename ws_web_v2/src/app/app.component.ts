import { Component } from '@angular/core';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth/auth.service';
import { NotificationService } from './services/notification/notification.service';
import { PlanLimitsWidgetComponent } from './components/plan-limits-widget/plan-limits-widget.component';
import { LanguageService } from './services/language/language.service';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { WeddingStatusBannerComponent } from './components/wedding-status-banner/wedding-status-banner.component';
import { IconComponent } from './shared/icons/icon.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterModule, CommonModule, PlanLimitsWidgetComponent, TranslateModule, SidebarComponent, WeddingStatusBannerComponent, IconComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})

export class AppComponent {
  title = 'wedding-planner-app';
  isSidebarCollapsed = false;

  constructor(public authService: AuthService, public notifService: NotificationService, private router: Router, private languageService: LanguageService) {}

  ngOnInit(): void {
    this.languageService.initLanguage();
    console.log('✅ App inicializada con idioma:', this.languageService.getCurrentLanguage());
  }

  salir() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
