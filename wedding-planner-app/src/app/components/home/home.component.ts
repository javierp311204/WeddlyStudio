import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HostListener } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { NotificacionesService } from '../../services/notificaciones/notificaciones.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { interval, Subscription } from 'rxjs';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { LanguageSelectorComponent } from '../language-selector/language-selector.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, LanguageSelectorComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  showStickyNav = false;

  mostrarPanel: boolean = false;
  notificaciones: any[] = [];
  notificacionesSinLeer: number = 0;

  private notifSubscription?: Subscription;

  constructor(
    public authService: AuthService,
    private router: Router,
    private notifService: NotificacionesService,
    private translate: TranslateService
  ) {}

  ngOnInit() {
    // 1. Carga inicial
    this.cargarNotificaciones();

    // 2. Auto-refresco cada 30 segundos
    this.notifSubscription = interval(30000).subscribe(() => {
      this.cargarNotificaciones();
    });
  }

  ngOnDestroy() {
    if (this.notifSubscription) {
      this.notifSubscription.unsubscribe();
    }
  }

  // Dentro de tu clase HomeComponent
  iniciarTour() {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      popoverClass: 'driverjs-theme',
      overlayColor: 'rgba(51, 47, 44, 0.7)',
      stagePadding: 10,
      steps: [
        {
          element: '.nav-logo',
          popover: {
            title: this.translate.instant('HOME.TOUR_STEP_1_TITLE'),
            description: this.translate.instant('HOME.TOUR_STEP_1_DESC'),
            side: 'bottom',
          },
        },
        {
          element: '.notif-wrapper',
          popover: {
            title: this.translate.instant('HOME.TOUR_STEP_2_TITLE'),
            description: this.translate.instant('HOME.TOUR_STEP_2_DESC'),
            side: 'bottom',
          },
        },
        {
          element: '.action-grid',
          popover: {
            title: this.translate.instant('HOME.TOUR_STEP_3_TITLE'),
            description: this.translate.instant('HOME.TOUR_STEP_3_DESC'),
            side: 'top',
          },
        },
        {
          element: '.logout-pill',
          popover: {
            title: this.translate.instant('HOME.TOUR_STEP_4_TITLE'),
            description: this.translate.instant('HOME.TOUR_STEP_4_DESC'),
            side: 'left',
          },
        },
      ],
    });

    driverObj.drive();
  }

  ngAfterViewInit() {
    const nick = localStorage.getItem('usuarioNick');
    const tourKey = `tourVisto_${nick}`;

    const yaVisto = localStorage.getItem(tourKey);

    if (nick && !yaVisto) {
      setTimeout(() => {
        this.iniciarTour();
        localStorage.setItem(tourKey, 'true');
      }, 1000);
    }
  }

  cargarNotificaciones() {
    const usuario = localStorage.getItem('usuarioNick');
    const codigo = localStorage.getItem('codigoBoda');
    const tipoUsuario = localStorage.getItem('tipoUsuario') || 'invitado';

    if (usuario && codigo) {
      this.notifService
        .getNotificaciones(usuario, codigo, tipoUsuario)
        .subscribe({
          next: (res: any) => {
            this.notificaciones = Array.isArray(res) ? res : [];
            this.notificacionesSinLeer = this.notificaciones.filter(
              (n) => !n.leida,
            ).length;
          },
          error: (err: any) =>
            console.error('Error al cargar notificaciones:', err),
        });
    }
  }

  toggleNotificaciones() {
    this.mostrarPanel = !this.mostrarPanel;
  }

  leerNotificacion(n: any) {
    // Marcar como leída
    if (!n.leida) {
      this.notifService.marcarComoLeida(n._id).subscribe({
        next: () => {
          n.leida = true;
          if (this.notificacionesSinLeer > 0) {
            this.notificacionesSinLeer--;
          }
        },
        error: (err: any) => console.error('Error al marcar como leída:', err),
      });
    }

    // Redirigir según el tipo
    this.redirigirSegunTipo(n);
  }

  redirigirSegunTipo(notificacion: any) {
    this.mostrarPanel = false;

    if (notificacion.ruta) {
      this.router.navigate([notificacion.ruta]);
      return;
    }

    switch (notificacion.tipo) {
      case 'foto':
         this.router.navigate(['/album']);
        break;
      case 'album':
        this.router.navigate(['/album']);
        break;
      case 'info-boda':
        this.router.navigate(['/info-boda']);
        break;
      case 'mesa':
        this.router.navigate(['/plano']);
        break;
      case 'info':
      case 'general':
        break;
      default:
        console.log('Tipo de notificación sin ruta:', notificacion.tipo);
    }
  }

  // --- TUS RUTAS ORIGINALES (MANTENIDAS) ---
  irAInfoBoda() {
    this.router.navigate(['/info-boda']);
  }
  irAMesas() {
    this.router.navigate(['/mesa-manager']);
  }
  irAPapeleria() {
    this.router.navigate(['/diseno-papeleria']);
  }
  verMiMesa() {
    this.router.navigate(['/mi-asiento']);
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollOffset =
      window.pageYOffset || document.documentElement.scrollTop;
    this.showStickyNav = scrollOffset > 400;

    const reveals = document.querySelectorAll('.reveal');
    for (let i = 0; i < reveals.length; i++) {
      const windowHeight = window.innerHeight;
      const elementTop = reveals[i].getBoundingClientRect().top;
      const elementVisible = 150;

      if (elementTop < windowHeight - elementVisible) {
        reveals[i].classList.add('active');
      }
    }
  }

  scrollToContent() {
    document
      .getElementById('marketing-content')
      ?.scrollIntoView({ behavior: 'smooth' });
  }
}