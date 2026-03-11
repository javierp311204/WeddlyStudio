import { Component, signal, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';
import { AuthService, WeddingRole } from '../../services/auth/auth.service';
import { LanguageSelectorComponent } from '../language-selector/language-selector.component';
import { TranslateService, TranslateModule } from '@ngx-translate/core';

interface NavItem {
  label:    string;
  title:    string;
  emoji:    string;
  route:    string;
  minRole?: WeddingRole;  
  exact?:   boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LanguageSelectorComponent, TranslateModule, HttpClientModule],
  templateUrl: './sidebar.component.html',
  styleUrl:    './sidebar.component.css',
})
export class SidebarComponent implements OnInit {
  @Output() collapsedChange = new EventEmitter<boolean>();

  collapsed = signal(false);
  avatarUrl: string | null = null;

  // minRole = rol mínimo para ver el ítem. Sin minRole = visible para todos.
  navItems: NavItem[] = [
    { label: 'NAV.HOME',       title: 'NAV.HOME',       emoji: '🏠', route: '/dashboard',  exact: true },
    { label: 'NAV.INFO',       title: 'NAV.INFO',       emoji: '📖', route: '/info-boda',  minRole: 'planner' },
    { label: 'NAV.GUESTS',     title: 'NAV.GUESTS',     emoji: '👥', route: '/invitados',  minRole: 'planner' },
    { label: 'NAV.CHECKLIST',  title: 'NAV.CHECKLIST',  emoji: '✅', route: '/checklist'  },
    { label: 'NAV.CALENDAR',   title: 'NAV.CALENDAR',    emoji: '📅', route: '/calendario'},              
    { label: 'NAV.DESIGN',     title: 'NAV.DESIGN',     emoji: '🎨', route: '/diseno',     minRole: 'co_organizer' },
    { label: 'NAV.TABLES',     title: 'NAV.TABLES',     emoji: '🪑', route: '/mesas',      minRole: 'planner' },
    { label: 'NAV.MAP',        title: 'NAV.MAP',        emoji: '🗺️', route: '/plano',      minRole: 'planner' },
    { label: 'NAV.ALBUM',      title: 'NAV.ALBUM',      emoji: '📸', route: '/album'      },              
    { label: 'NAV.COLLABORATORS', title: 'NAV.COLLABORATORS', emoji: '👥', route: '/colaboradores', minRole: 'co_organizer' },
    { label: 'NAV.PRICING',    title: 'NAV.PRICING',    emoji: '💎', route: '/pricing'    },
                  
  ];

  constructor(public authService: AuthService, private http: HttpClient, private translate: TranslateService) {}

  ngOnInit(): void {
    // Avatar — caché instantánea + refresco desde backend
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

  // Filtra los ítems según el rol actual del usuario en la boda activa
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