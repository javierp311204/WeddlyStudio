import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { NotificationService } from '../../services/notification/notification.service';
import { AuthService } from '../../services/auth/auth.service';

interface Boda {
  id:            string;
  name:          string;
  wedding_date:  string | null;
  location_name: string | null;
  status:        string;
  plan_type:     string;
  is_owner:      boolean;
  my_role:       string;
  _count: {
    guests: number;
    tables: number;
    tasks:  number;
  };
}

@Component({
  selector: 'app-mis-bodas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule, HttpClientModule],
  templateUrl: './mis-bodas.component.html',
  styleUrl:    './mis-bodas.component.css',
})
export class MisBodasComponent implements OnInit {

  bodas: Boda[]      = [];
  cargando           = true;
  activaId           = '';

  // Modal nueva boda
  showNuevaModal     = false;
  creando            = false;
  nuevaForm          = { name: '', wedding_date: '' };
  nuevaError         = '';

  // Modal upgrade
  showUpgradeModal   = false;
  upgradeReason      = '';

  // Modal confirmar eliminar
  showEliminarModal  = false;
  bodaAEliminar: Boda | null = null;
  eliminando         = false;

  private apiUrl = 'http://localhost:3000/api';

  constructor(
    private http:         HttpClient,
    private notifService: NotificationService,
    private authService:  AuthService,
    private translate:    TranslateService,
    private router:       Router,
  ) {}

  ngOnInit() {
    this.activaId = localStorage.getItem('weddingId') ?? '';
    this.cargarBodas();
  }

  private getHeaders() {
    const token = localStorage.getItem('token');
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  // ── Cargar lista ────────────────────────────────────────────

  cargarBodas() {
    this.cargando = true;
    this.http.get<any>(`${this.apiUrl}/weddings`, this.getHeaders()).subscribe({
      next: (res) => {
        this.bodas   = res?.data ?? [];
        this.cargando = false;

        // Si no hay boda activa seleccionada, seleccionar la primera
        if (!this.activaId && this.bodas.length > 0) {
          this.seleccionarBoda(this.bodas[0]);
        }
      },
      error: () => {
        this.cargando = false;
        this.notifService.showError('Error', 'No se pudieron cargar las bodas');
      },
    });
  }

  // ── Cambiar boda activa ─────────────────────────────────────

  seleccionarBoda(boda: Boda) {
    if (this.activaId === boda.id) return;

    this.activaId = boda.id;
    localStorage.setItem('weddingId', boda.id);

    // Recargar el contexto de AuthService si tiene método para ello
    if (typeof (this.authService as any).setWeddingId === 'function') {
      (this.authService as any).setWeddingId(boda.id);
    }

    this.notifService.showSuccess(
      'Cambio de boda',
      `Boda activa: ${boda.name}`,
    );

    // Navegar al dashboard con la nueva boda activa
    this.router.navigate(['/dashboard']);
  }

  // ── Verificar límite antes de abrir modal ───────────────────

  abrirNuevaBoda() {
    this.http.get<any>(`${this.apiUrl}/weddings/can-create`, this.getHeaders()).subscribe({
      next: (res) => {
        const { allowed, plan, limit } = res.data;
        if (allowed) {
          this.nuevaForm  = { name: '', wedding_date: '' };
          this.nuevaError = '';
          this.showNuevaModal = true;
        } else {
          this.upgradeReason = `Tu plan "${this.getPlanLabel(plan)}" solo permite ${limit} boda(s).`;
          this.showUpgradeModal = true;
        }
      },
      error: () => this.notifService.showError('Error', 'No se pudo verificar el plan'),
    });
  }

  // ── Crear boda ──────────────────────────────────────────────

  crearBoda() {
    if (!this.nuevaForm.name.trim()) {
      this.nuevaError = 'El nombre de la boda es obligatorio';
      return;
    }

    this.creando = true;
    const payload: any = { name: this.nuevaForm.name.trim() };
    if (this.nuevaForm.wedding_date) {
      payload.wedding_date = new Date(this.nuevaForm.wedding_date).toISOString();
    }

    this.http.post<any>(`${this.apiUrl}/weddings`, payload, this.getHeaders()).subscribe({
      next: (res) => {
        const boda = res.data;
        this.creando        = false;
        this.showNuevaModal = false;

        this.notifService.showSuccess('✓', `Boda "${boda.name}" creada correctamente`);
        this.cargarBodas();

        // Activar la nueva boda automáticamente
        setTimeout(() => {
          const nueva = this.bodas.find(b => b.id === boda.id);
          if (nueva) this.seleccionarBoda(nueva);
        }, 400);
      },
      error: (err) => {
        this.creando = false;
        const code = err?.error?.code;
        if (code === 'PLAN_LIMIT_REACHED') {
          this.showNuevaModal  = false;
          this.upgradeReason   = err.error.message;
          this.showUpgradeModal = true;
        } else {
          this.nuevaError = err?.error?.message || 'No se pudo crear la boda';
        }
      },
    });
  }

  // ── Eliminar boda ────────────────────────────────────────────

  confirmarEliminar(boda: Boda, event: Event) {
    event.stopPropagation();
    this.bodaAEliminar    = boda;
    this.showEliminarModal = true;
  }

  ejecutarEliminar() {
    if (!this.bodaAEliminar) return;
    this.eliminando = true;

    this.http.delete<any>(
      `${this.apiUrl}/weddings/${this.bodaAEliminar.id}`,
      this.getHeaders(),
    ).subscribe({
      next: () => {
        this.eliminando        = false;
        this.showEliminarModal = false;

        this.notifService.showSuccess('✓', `Boda eliminada correctamente`);

        // Si era la activa, limpiar localStorage y seleccionar otra
        if (this.activaId === this.bodaAEliminar!.id) {
          localStorage.removeItem('weddingId');
          this.activaId = '';
        }

        this.bodaAEliminar = null;
        this.cargarBodas();
      },
      error: (err) => {
        this.eliminando = false;
        const msg = err?.error?.message || 'No se pudo eliminar la boda';
        this.notifService.showError('Error', msg);
      },
    });
  }

  // ── Helpers UI ───────────────────────────────────────────────

  getPlanLabel(plan: string): string {
    const map: Record<string, string> = {
      free:         'Free',
      one_time:     'Evento PRO',
      subscription: 'Premium',
    };
    return map[plan] ?? plan;
  }

  getPlanClass(plan: string): string {
    const map: Record<string, string> = {
      free:         'plan-free',
      one_time:     'plan-pro',
      subscription: 'plan-premium',
    };
    return map[plan] ?? '';
  }

  formatDate(date: string | null): string {
    if (!date) return 'Fecha por definir';
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  getRoleLabel(role: string): string {
    const map: Record<string, string> = {
      bride:   'Novia/Novio',
      groom:   'Novio/Novia',
      planner: 'Wedding Planner',
      guest:   'Invitado',
    };
    return map[role] ?? role;
  }

  irAPricing(event: Event) {
    event.stopPropagation();
    this.showUpgradeModal = false;
    this.router.navigate(['/pricing']);
  }

  cerrarNuevaModal()    { this.showNuevaModal    = false; }
  cerrarUpgradeModal()  { this.showUpgradeModal  = false; }
  cerrarEliminarModal() { this.showEliminarModal = false; this.bodaAEliminar = null; }
}