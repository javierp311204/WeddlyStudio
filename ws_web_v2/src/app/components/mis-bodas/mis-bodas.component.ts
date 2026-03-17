import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { NotificationService } from '../../services/notification/notification.service';
import { AuthService, WeddingRole } from '../../services/auth/auth.service';
import { IconComponent } from '../../shared/icons/icon.component';

interface Boda {
  id:             string;
  name:           string;
  wedding_date:   string | null;
  location_name:  string | null;
  status:         string;
  readonly_reason?: string | null; // 👈 añadido
  plan_type:      string;
  is_owner:       boolean;
  my_role:        WeddingRole;
  _count: {
    guests: number;
    tables: number;
    tasks:  number;
  };
}

@Component({
  selector: 'app-mis-bodas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule, HttpClientModule, IconComponent],
  templateUrl: './mis-bodas.component.html',
  styleUrl:    './mis-bodas.component.css',
})
export class MisBodasComponent implements OnInit {

  bodas: Boda[]      = [];
  cargando           = true;
  activaId           = '';

  showNuevaModal     = false;
  creando            = false;
  nuevaForm          = { name: '', wedding_date: '' };
  nuevaError         = '';

  showUpgradeModal   = false;
  upgradeReason      = '';

  showEliminarModal  = false;
  bodaAEliminar: Boda | null = null;
  eliminando         = false;

  private apiUrl = 'https://weddly-api-production.up.railway.app/api';

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

  cargarBodas() {
    this.cargando = true;
    this.http.get<any>(`${this.apiUrl}/weddings`, this.getHeaders()).subscribe({
      next: (res) => {
        this.bodas    = res?.data ?? [];
        this.cargando = false;

        if (!this.activaId && this.bodas.length > 0) {
          this.seleccionarBoda(this.bodas[0]);
        } else if (this.activaId) {
          // Sincronizar rol, status y readonlyReason de la boda activa
          const activa = this.bodas.find(b => b.id === this.activaId);
          if (activa) {
            this.authService.setWeddingRole(activa.my_role);
            this.authService.setWeddingStatus(activa.status ?? 'active');           // 👈
            this.authService.setReadonlyReason(activa.readonly_reason ?? null);     // 👈
          }
        }
      },
      error: () => {
        this.cargando = false;
        this.notifService.showError(this.translate.instant('COMMON.ERROR'), this.translate.instant('WEDDINGS.ERROR_LOAD'));
      },
    });
  }

  seleccionarBoda(boda: Boda) {
    if (this.activaId === boda.id) return;

    this.activaId = boda.id;
    localStorage.setItem('weddingId', boda.id);

    this.authService.setWeddingRole(boda.my_role);
    this.authService.setWeddingStatus(boda.status ?? 'active');           // 👈
    this.authService.setReadonlyReason(boda.readonly_reason ?? null);     // 👈

    this.notifService.showSuccess(
      this.translate.instant('WEDDINGS.SUCCESS_CHANGE'),
      this.translate.instant('WEDDINGS.SUCCESS_ACTIVE', { name: boda.name }),
    );
    this.router.navigate(['/dashboard']);
  }

  abrirNuevaBoda() {
    this.http.get<any>(`${this.apiUrl}/weddings/can-create`, this.getHeaders()).subscribe({
      next: (res) => {
        const { allowed, plan, limit } = res.data;
        if (allowed) {
          this.nuevaForm  = { name: '', wedding_date: '' };
          this.nuevaError = '';
          this.showNuevaModal = true;
        } else {
          this.upgradeReason  = `Tu plan "${this.getPlanLabel(plan)}" solo permite ${limit} boda(s).`;
          this.showUpgradeModal = true;
        }
      },
      error: () => this.notifService.showError(
        this.translate.instant('COMMON.ERROR'),
        this.translate.instant('WEDDINGS.ERROR_VERIFY_PLAN'),
      ),
    });
  }

  crearBoda() {
    if (!this.nuevaForm.name.trim()) {
      this.nuevaError = this.translate.instant('WEDDINGS.ERROR_NAME_REQUIRED');
      return;
    }

    this.creando = true;
    const payload: any = { name: this.nuevaForm.name.trim() };
    if (this.nuevaForm.wedding_date) {
      payload.wedding_date = new Date(this.nuevaForm.wedding_date).toISOString();
    }

    this.http.post<any>(`${this.apiUrl}/weddings`, payload, this.getHeaders()).subscribe({
      next: (res) => {
        this.creando        = false;
        this.showNuevaModal = false;
        this.notifService.showSuccess('✓', this.translate.instant('WEDDINGS.SUCCESS_CREATED', { name: res.data.name }));
        this.cargarBodas();

        setTimeout(() => {
          const nueva = this.bodas.find(b => b.id === res.data.id);
          if (nueva) this.seleccionarBoda(nueva);
        }, 400);
      },
      error: (err) => {
        this.creando = false;
        const code = err?.error?.code;
        if (code === 'PLAN_LIMIT_REACHED') {
          this.showNuevaModal   = false;
          this.upgradeReason    = err.error.message;
          this.showUpgradeModal = true;
        } else if (code === 'EMAIL_NOT_VERIFIED') {
          this.showNuevaModal = false;
          this.notifService.showError(
            this.translate.instant('AUTH.EMAIL_NOT_VERIFIED_TITLE'),
            this.translate.instant('AUTH.EMAIL_NOT_VERIFIED_DESC'),
          );
        } else {
          this.nuevaError = err?.error?.message || this.translate.instant('WEDDINGS.ERROR_CREATE');
        }
      },
    });
  }

  confirmarEliminar(boda: Boda, event: Event) {
    event.stopPropagation();
    if (boda.my_role !== 'owner') {
      this.notifService.showError(
        this.translate.instant('COMMON.ERROR'),
        this.translate.instant('WEDDINGS.ERROR_PERMISSIONS'),
      );
      return;
    }
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
        this.notifService.showSuccess('✓', this.translate.instant('WEDDINGS.SUCCESS_DELETED'));

        if (this.activaId === this.bodaAEliminar!.id) {
          localStorage.removeItem('weddingId');
          localStorage.removeItem('weddingRole');
          localStorage.removeItem('weddingStatus');       // 👈 limpiar también
          localStorage.removeItem('weddingReadonlyReason'); // 👈
          this.activaId = '';
        }

        this.bodaAEliminar = null;
        this.cargarBodas();
      },
      error: (err) => {
        this.eliminando = false;
        this.notifService.showError(
          this.translate.instant('COMMON.ERROR'),
          err?.error?.message || this.translate.instant('WEDDINGS.ERROR_DELETE'),
        );
      },
    });
  }

  // ── Helpers UI ───────────────────────────────────────────────

  puedeEliminar(boda: Boda): boolean { return boda.my_role === 'owner'; }
  puedeEditar(boda: Boda):   boolean { return boda.my_role === 'owner' || boda.my_role === 'co_organizer'; }

  getPlanLabel(plan: string): string {
    const map: Record<string, string> = {
      free:         this.translate.instant('WEDDINGS.PLAN_FREE'),
      one_time:     this.translate.instant('WEDDINGS.PLAN_ONE_TIME'),
      subscription: this.translate.instant('WEDDINGS.PLAN_SUBSCRIPTION'),
    };
    return map[plan] ?? plan;
  }

  getPlanClass(plan: string): string {
    const map: Record<string, string> = {
      free: 'plan-free', one_time: 'plan-pro', subscription: 'plan-premium',
    };
    return map[plan] ?? '';
  }

  formatDate(date: string | null): string {
    if (!date) return this.translate.instant('WEDDINGS.DATE_UNDEFINED');
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  getRoleLabel(role: string): string {
    const map: Record<string, string> = {
      owner:        this.translate.instant('WEDDINGS.ROLE_OWNER'),
      co_organizer: this.translate.instant('WEDDINGS.ROLE_CO_ORGANIZER'),
      planner:      this.translate.instant('WEDDINGS.ROLE_PLANNER'),
      guest:        this.translate.instant('WEDDINGS.ROLE_GUEST'),
    };
    return map[role] ?? role;
  }

  getRoleClass(role: string): string {
    const map: Record<string, string> = {
      owner: 'role-owner', co_organizer: 'role-co-org',
      planner: 'role-planner', guest: 'role-guest',
    };
    return map[role] ?? '';
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