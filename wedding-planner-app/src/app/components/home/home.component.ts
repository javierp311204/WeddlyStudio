import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HostListener } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { NotificacionesService } from '../../services/notificaciones/notificaciones.service';
import { interval, Subscription } from 'rxjs';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
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
      popoverClass: 'driverjs-theme', // Esta clase debe coincidir con tu CSS
      overlayColor: 'rgba(51, 47, 44, 0.7)',
      stagePadding: 10,
      steps: [
        {
          element: '.nav-logo',
          popover: {
            title: '✨ Vuestra Boda Digital',
            description:
              'Bienvenidos a vuestro panel personal. Aquí todo está listo para que disfrutéis del gran día.',
            side: 'bottom',
          },
        },
        {
          element: '.notif-wrapper',
          popover: {
            title: '🔔 Campana de Avisos',
            description:
              'No os perdáis nada. Aquí os avisaremos cuando alguien suba fotos o haya cambios de última hora.',
            side: 'bottom',
          },
        },
        {
          element: '.action-grid',
          popover: {
            title: '🚀 Accesos Rápidos',
            description:
              'Sube fotos al álbum, consulta tu mesa o revisa la agenda en un solo clic.',
            side: 'top',
          },
        },
        {
          element: '.logout-pill',
          popover: {
            title: '👋 Hasta pronto',
            description:
              'Puedes cerrar sesión aquí, aunque te recomendamos dejarla abierta para recibir avisos.',
            side: 'left',
          },
        },
      ],
    });

    driverObj.drive();
  }
  // Para que solo se muestre la primera vez que se registran
  ngAfterViewInit() {
    const nick = localStorage.getItem('usuarioNick');
    const tourKey = `tourVisto_${nick}`;

    const yaVisto = localStorage.getItem(tourKey);

    if (nick && !yaVisto) {
      setTimeout(() => {
        this.iniciarTour();
        localStorage.setItem(tourKey, 'true');
      }, 1000); // Un pequeño delay para que cargue bien la vista
    }
  }

  cargarNotificaciones() {
    const usuario = localStorage.getItem('usuarioNick');
    const codigo = localStorage.getItem('codigoBoda');

    if (usuario && codigo) {
      // Tipamos explícitamente la respuesta como 'any' para evitar el error de tipado
      this.notifService.getNotificaciones(usuario, codigo).subscribe({
        next: (res: any) => {
          // Nos aseguramos de que la respuesta sea un array antes de procesarla
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
    if (!n.leida) {
      this.notifService.marcarComoLeida(n._id).subscribe({
        next: () => {
          n.leida = true;
          // Actualizamos el contador restando 1 de forma segura
          if (this.notificacionesSinLeer > 0) {
            this.notificacionesSinLeer--;
          }
        },
        error: (err: any) => console.error('Error al marcar como leída:', err),
      });
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
