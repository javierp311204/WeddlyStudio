import { Component, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { LanguageSelectorComponent } from '../language-selector/language-selector.component';

interface NavItem {
  label:      string;
  emoji:      string;
  route:      string;
  ownerOnly?: boolean;
  exact?:     boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LanguageSelectorComponent],
  templateUrl: './sidebar.component.html',
  styleUrl:    './sidebar.component.css',
})
export class SidebarComponent {
  @Output() collapsedChange = new EventEmitter<boolean>();

  collapsed = signal(false);

  navItems: NavItem[] = [
    { label: 'Inicio',       emoji: '🏠', route: '/dashboard',  exact: true },
    { label: 'Info de Boda', emoji: '📖', route: '/info-boda',  ownerOnly: true },
    { label: 'Invitados',    emoji: '👥', route: '/invitados',  ownerOnly: true },
    { label: 'Checklist',    emoji: '✅', route: '/checklist',  ownerOnly: true },
    { label: 'Diseño',       emoji: '🎨', route: '/diseno',     ownerOnly: true },
    { label: 'Mesas',        emoji: '🪑', route: '/mesas',      ownerOnly: true },
    { label: 'Plano',        emoji: '🗺️', route: '/plano',      ownerOnly: true },
    { label: 'Álbum',        emoji: '📸', route: '/album' },
    { label: 'Planes',       emoji: '💎', route: '/pricing' },
  ];

  constructor(public authService: AuthService) {}

  toggle() {
    this.collapsed.update(v => !v);
    this.collapsedChange.emit(this.collapsed());
  }

  getInitial(): string {
    return (this.authService.getUserNick() || '?').charAt(0).toUpperCase();
  }
}