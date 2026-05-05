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
import { AiChatComponent } from './components/ai-chat/ai-chat.component';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterModule, CommonModule, PlanLimitsWidgetComponent, TranslateModule, SidebarComponent, WeddingStatusBannerComponent, IconComponent, AiChatComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})

export class AppComponent {
  title = 'wedding-planner-app';
  isSidebarCollapsed = false;

  private API_URL = environment.apiUrl + '/auth';

  constructor(
    public authService: AuthService,
    public notifService: NotificationService,
    private router: Router,
    private languageService: LanguageService,
    private http: HttpClient,  // ← AÑADIR
  ) {}

  ngOnInit(): void {
    this.languageService.initLanguage();
    this.manejarHashSocial(); // ← AÑADIR
  }

  private manejarHashSocial(): void {
    const hash = window.location.hash;
    if (!hash.includes('access_token')) return;

    const params = new URLSearchParams(hash.substring(1));
    const supabaseToken = params.get('access_token');
    if (!supabaseToken) return;

    window.history.replaceState(null, '', window.location.pathname);

    this.http.post<any>(`${this.API_URL}/social/token`, { access_token: supabaseToken }, { withCredentials: true })
      .subscribe({
        next: (res) => {
          const user = res.data?.user;
          localStorage.setItem('userId',    user.id);
          localStorage.setItem('userEmail', user.email);
          localStorage.setItem('firstName', user.first_name);
          localStorage.setItem('lastName',  user.last_name);
          localStorage.setItem('rol',       user.role_global);

          this.router.navigateByUrl('/dashboard');
        },
        error: () => {
          this.router.navigateByUrl('/login?error=social_auth_failed');
        }
      });
  }

  salir() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
