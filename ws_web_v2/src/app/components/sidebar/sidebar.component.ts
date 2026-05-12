import { Component, signal, Output, EventEmitter, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService, WeddingRole } from '../../services/auth/auth.service';
import { LanguageSelectorComponent } from '../language-selector/language-selector.component';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { IconComponent } from '../../shared/icons/icon.component';
import { environment } from '../../../environments/environment';

interface NavChild {
  label: string;
  icon:  string;
  title: string;
  route: string;
  minRole?: WeddingRole;
}

interface NavItem {
  label:    string;
  title:    string;
  icon:     string;
  route:    string;
  minRole?: WeddingRole;
  exact?:   boolean;
  children?: NavChild[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LanguageSelectorComponent, TranslateModule, IconComponent],
  templateUrl: './sidebar.component.html',
  styleUrl:    './sidebar.component.css',
})
export class SidebarComponent implements OnInit {
  @Output() collapsedChange = new EventEmitter<boolean>();

  collapsed = signal(false);
  avatarUrl: string | null = null;
  openMenus = new Set<string>();

  /** Posición vertical del panel de submenú en móvil (px desde top de la ventana) */
  submenuTop = 0;

  /** Detecta si estamos en viewport móvil */
  get isMobile(): boolean {
    return window.innerWidth <= 768;
  }

  navItems: NavItem[] = [
    { label: 'NAV.HOME',      title: 'NAV.HOME',      icon: 'home',       route: '/dashboard',    exact: true },
    {
      label: 'Organización', title: 'Organización', icon: 'infoBoda', route: '/wedding-info',
      children: [
        { label: 'NAV.INFO',          title: 'NAV.INFO',          icon: 'infoBoda',      route: '/wedding-info' },
        { label: 'NAV.COLLABORATORS', title: 'NAV.COLLABORATORS', icon: 'colaboradores', route: '/collaborators', minRole: 'co_organizer' },
        { label: 'NAV.BUDGET',        title: 'NAV.BUDGET',        icon: 'cash',          route: '/budget',        minRole: 'planner' },
        { label: 'NAV.CHECKLIST',     title: 'NAV.CHECKLIST',     icon: 'checklist',     route: '/checklist',     minRole: 'planner' },
        { label: 'NAV.CALENDAR',      title: 'NAV.CALENDAR',      icon: 'calendario',    route: '/calendar',      minRole: 'planner' },
      ],
    },
    {
      label: 'NAV.GUESTS', title: 'NAV.GUESTS', icon: 'invitados', route: '/guests', minRole: 'planner',
      children: [
        { label: 'Lista',         title: 'Lista',         icon: 'invitados', route: '/guests',  minRole: 'planner' },
        { label: 'NAV.MAP',       title: 'NAV.MAP',       icon: 'plano',     route: '/map',     minRole: 'planner' },
        { label: 'NAV.TABLES',    title: 'NAV.TABLES',    icon: 'mesas',     route: '/tables',  minRole: 'planner' },
        { label: 'NAV.DESIGN',    title: 'NAV.DESIGN',    icon: 'diseno',    route: '/design',  minRole: 'co_organizer' },
      ],
    },
    { label: 'NAV.ALBUM',   title: 'NAV.ALBUM',   icon: 'album',  route: '/album' },
    { label: 'NAV.PRICING', title: 'NAV.PRICING', icon: 'planes', route: '/pricing' },
  ];

  constructor(
    public authService: AuthService,
    private http: HttpClient,
    private translate: TranslateService,
  ) {}

  private apiUrl = environment.apiUrl;

  ngOnInit(): void {
    const cached = this.authService.getAvatarUrl();
    if (cached) this.avatarUrl = cached;

    this.authService.getMe().subscribe({
      next: (res) => {
        const url = res?.data?.avatar_url ?? res?.avatar_url;
        if (url) {
          this.avatarUrl = url;
          this.authService.updateAvatar(url);
        }
      },
    });
  }

  /** Cierra el submenú al cambiar el tamaño de ventana si cambiamos entre móvil/desktop */
  @HostListener('window:resize')
  onResize(): void {
    if (this.openMenus.size > 0) {
      this.openMenus.clear();
    }
  }

  get visibleNavItems(): NavItem[] {
    return this.navItems.filter(item =>
      !item.minRole || this.authService.hasMinRole(item.minRole)
    );
  }

  get openMenuItem(): NavItem | undefined {
    return this.visibleNavItems.find(item => item.children && this.isOpen(item.route));
  }

  toggle() {
    this.collapsed.update(v => !v);
    this.collapsedChange.emit(this.collapsed());
    // Cerrar submenu al colapsar
    if (this.collapsed()) this.openMenus.clear();
  }

  /**
   * En móvil calcula la posición vertical del popover a partir del botón que lo disparó,
   * evitando que se salga de la pantalla por abajo.
   */
  toggleMenu(route: string, event?: MouseEvent): void {
    if (this.openMenus.has(route)) {
      this.openMenus.delete(route);
      return;
    }

    this.openMenus.clear();
    this.openMenus.add(route);

    // En móvil o desktop colapsado: calcular posición vertical del popover
    if ((this.isMobile || this.collapsed()) && event) {
      const btn = event.currentTarget as HTMLElement;
      const rect = btn.getBoundingClientRect();
      const panelEstimatedHeight = 280;
      const spaceBelow = window.innerHeight - rect.top;
      this.submenuTop = spaceBelow < panelEstimatedHeight
        ? Math.max(8, rect.bottom - panelEstimatedHeight)
        : rect.top;
    } else {
      this.submenuTop = 0; // desktop expandido: panel ocupa toda la altura
    }
  }

  isOpen(route: string): boolean {
    // El submenú se muestra siempre que esté en el set,
    // en desktop expandido se renderiza como panel lateral fijo (top:0, height:100vh),
    // en desktop colapsado o móvil como popover posicionado verticalmente.
    return this.openMenus.has(route);
  }

  closeMenu(): void {
    this.openMenus.clear();
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