import { Component, signal, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';
import { AuthService, WeddingRole } from '../../services/auth/auth.service';
import { LanguageSelectorComponent } from '../language-selector/language-selector.component';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { IconComponent } from '../../shared/icons/icon.component';

interface NavItem {
  label:    string;
  title:    string;
  icon:     string;   
  route:    string;
  minRole?: WeddingRole;
  exact?:   boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LanguageSelectorComponent, TranslateModule, HttpClientModule, IconComponent],
  templateUrl: './sidebar.component.html',
  styleUrl:    './sidebar.component.css',
})
export class SidebarComponent implements OnInit {
  @Output() collapsedChange = new EventEmitter<boolean>();

  collapsed = signal(false);
  avatarUrl: string | null = null;

  navItems: NavItem[] = [
    { label: 'NAV.HOME',          title: 'NAV.HOME',          icon: 'home',          route: '/dashboard',      exact: true },
    { label: 'NAV.INFO',          title: 'NAV.INFO',          icon: 'infoBoda',      route: '/info-boda',      minRole: 'planner' },
    { label: 'NAV.GUESTS',        title: 'NAV.GUESTS',        icon: 'invitados',     route: '/invitados',      minRole: 'planner' },
    { label: 'NAV.CHECKLIST',     title: 'NAV.CHECKLIST',     icon: 'checklist',     route: '/checklist' },
    { label: 'NAV.CALENDAR',      title: 'NAV.CALENDAR',      icon: 'calendario',    route: '/calendario' },
    { label: 'NAV.DESIGN',        title: 'NAV.DESIGN',        icon: 'diseno',        route: '/diseno',         minRole: 'co_organizer' },
    { label: 'NAV.TABLES',        title: 'NAV.TABLES',        icon: 'mesas',         route: '/mesas',          minRole: 'planner' },
    { label: 'NAV.MAP',           title: 'NAV.MAP',           icon: 'plano',         route: '/plano',          minRole: 'planner' },
    { label: 'NAV.ALBUM',         title: 'NAV.ALBUM',         icon: 'album',         route: '/album' },
    { label: 'NAV.COLLABORATORS', title: 'NAV.COLLABORATORS', icon: 'colaboradores', route: '/colaboradores',  minRole: 'co_organizer' },
    { label: 'NAV.PRICING',       title: 'NAV.PRICING',       icon: 'planes',        route: '/pricing' },
  ];

  constructor(public authService: AuthService, private http: HttpClient, private translate: TranslateService) {}

  ngOnInit(): void {
    const cached = this.authService.getAvatarUrl();
    if (cached) this.avatarUrl = cached;

    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<any>('http://localhost:3000/api/auth/me', {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
    }).subscribe({
      next: (res) => {
        const url = res?.data?.avatar_url ?? res?.avatar_url;
        if (url) {
          this.avatarUrl = url;
          this.authService.updateAvatar(url);
        }
      },
    });
  }

  get visibleNavItems(): NavItem[] {
    return this.navItems.filter(item =>
      !item.minRole || this.authService.hasMinRole(item.minRole)
    );
  }

  toggle() {
    this.collapsed.update(v => !v);
    this.collapsedChange.emit(this.collapsed());
  }

  getRoleLabel(): string {
    const role = this.authService.getWeddingRole();
    const map: Record<string, string> = {
      owner:        this.translate.instant('AUTH.OWNER'),
      co_organizer: this.translate.instant('AUTH.CO_ORGANIZER'),
      planner:      this.translate.instant('AUTH.PLANNER'),
      guest:        this.translate.instant('AUTH.GUEST'),
    };
    return map[role] ?? this.translate.instant('AUTH.GUEST');
  }

  getInitial(): string {
    return (this.authService.getUserNick() || '?').charAt(0).toUpperCase();
  }
}