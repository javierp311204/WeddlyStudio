import {
  Component, OnInit, ViewChild, ElementRef,
  AfterViewInit, OnDestroy, NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Canvas, Circle, Group, Text, Pattern } from 'fabric';
import { NotificationService } from '../../services/notification/notification.service';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { PlanoService, Table, GuestSummary } from '../../services/plano/plano.service';
import { environment } from '../../../enviroments/enviroment';

// ─── Colores por grupo ────────────────────────────────────────────
const GROUP_COLORS: Record<string, string> = {
  familia:  '#d4a373',
  amigos:   '#606c38',
  trabajo:  '#3a86ff',
  pareja:   '#e63946',
  otro:     '#6c757d',
};

interface FabricMesaGroup extends Group {
  data: {
    mesaId: string;
    tipo:   string;
    mesa:   Table;
  };
}

@Component({
  selector:    'app-plano-interactivo',
  standalone:  true,
  imports:     [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './plano-interactivo.component.html',
  styleUrl:    './plano-interactivo.component.css',
})
export class PlanoInteractivoComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvasElement', { static: false }) canvasElement!: ElementRef<HTMLCanvasElement>;

  canvas!: Canvas;
  mesas:     Table[]        = [];
  weddingId: string         = '';

  // FIX: rol leído de localStorage para controlar visibilidad de acciones
  weddingRole: string = 'guest';
  get puedeEditar(): boolean {
    return ['owner', 'co_organizer', 'planner'].includes(this.weddingRole);
  }

  canvasWidth  = 1200;
  canvasHeight = 800;

  modoEdicion         = false;  // empieza en modo vista por defecto
  mesaSeleccionada:   Table | null = null;

  invitadosDisponibles: GuestSummary[] = [];
  invitadosFiltrados:   GuestSummary[] = [];
  busquedaInvitado:     string         = '';
  invitadoSeleccionado: GuestSummary | null = null;
  listaInvitadosAbierta = false;
  invitadoModalInfo:    GuestSummary | null = null;

  private modalJustOpened       = false;
  private guardarPosicionSubject = new Subject<FabricMesaGroup>();

  // FIX: HTTP solo para invitados (guests API) — el resto va por PlanoService
  private apiUrl = environment.apiUrl;

  constructor(
    private http:         HttpClient,
    private planoService: PlanoService,
    private notifService: NotificationService,
    private router:       Router,
    private ngZone:       NgZone,
  ) {}

  // FIX: headers solo se usan para la llamada de guests (aún directa)
  // PlanoService ya gestiona sus propios headers
  private getHeaders() {
    const token = localStorage.getItem('token');
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  ngOnInit() {
    this.weddingId   = localStorage.getItem('weddingId')   ?? '';
    this.weddingRole = localStorage.getItem('weddingRole') ?? 'guest';

    if (!this.weddingId) {
      this.notifService.showError('Error', 'No se encontró weddingId');
      this.router.navigate(['/home']);
      return;
    }

    this.guardarPosicionSubject.pipe(debounceTime(500)).subscribe((objeto) => {
      this.guardarPosicionMesaEnBackend(objeto);
    });
  }

  ngAfterViewInit() {
    this.inicializarCanvas();
    Promise.resolve().then(() => this.cargarPlano());

    if (this.canvasElement?.nativeElement) {
      this.canvasElement.nativeElement.addEventListener('mousedown', (e) => e.stopPropagation(), true);
      this.canvasElement.nativeElement.addEventListener('mouseup',   (e) => e.stopPropagation(), true);
    }
  }

  ngOnDestroy() {
    if (this.canvas) this.canvas.dispose();
    this.guardarPosicionSubject.complete();
  }

  inicializarCanvas() {
    this.canvas = new Canvas(this.canvasElement.nativeElement, {
      width:           this.canvasWidth,
      height:          this.canvasHeight,
      backgroundColor: '#fdfaf7',
      selection:       this.modoEdicion,
    });

    this.dibujarGrid();

    this.canvas.on('object:modified', (options) => {
      const group = options.target as unknown as FabricMesaGroup;
      if (group?.data?.mesaId) this.guardarPosicionMesa(group);
    });

    this.canvas.on('mouse:down', (options) => {
      const target = options.target as any;
      if (target?.data?.tipo === 'mesa') {
        this.seleccionarMesa(target.data.mesaId);
      }
    });

    this.canvas.on('object:moving', (e) => {
      const obj  = e.target!;
      const halfW = obj.getScaledWidth()  / 2;
      const halfH = obj.getScaledHeight() / 2;
      if (obj.left! < halfW)                    obj.left = halfW;
      if (obj.top!  < halfH)                    obj.top  = halfH;
      if (obj.left! > this.canvasWidth  - halfW) obj.left = this.canvasWidth  - halfW;
      if (obj.top!  > this.canvasHeight - halfH) obj.top  = this.canvasHeight - halfH;
    });
  }

  dibujarGrid() {
    const gridSize    = 50;
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width  = gridSize;
    patternCanvas.height = gridSize;
    const ctx = patternCanvas.getContext('2d')!;
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth   = 1;
    ctx.strokeRect(0, 0, gridSize, gridSize);
    const pattern = new Pattern({ source: patternCanvas as any, repeat: 'repeat' });
    this.canvas.set({ backgroundColor: pattern });
    this.canvas.renderAll();
  }

  // ─── Carga de datos ───────────────────────────────────────────

  cargarPlano() {
    // FIX: usar PlanoService en lugar de llamada HTTP directa
    this.planoService.getPlano(this.weddingId).subscribe({
      next: (resTables) => {
        this.mesas = resTables?.data?.tables ?? [];

        // Cargar todos los invitados para el buscador
        this.http
          .get<any>(`${this.apiUrl}/weddings/${this.weddingId}/guests`, this.getHeaders())
          .subscribe({
            next: (resGuests) => {
              const todos: GuestSummary[] = resGuests?.data?.guests ?? resGuests?.guests ?? [];
              this.invitadosDisponibles   = todos;

              // Asociar invitados a mesas usando la lista completa
              this.mesas.forEach((mesa) => {
                mesa.guests = todos.filter((g) => (g as any).table_id === mesa.id);
              });

              this.renderizarMesas();
            },
            error: () => this.renderizarMesas(),
          });
      },
      error: (err) => {
        console.error('Error al cargar plano:', err);
        this.notifService.showError('Error', 'No se pudo cargar el plano');
        this.renderizarMesas();
      },
    });
  }

  renderizarMesas() {
    this.canvas.getObjects().forEach((obj: any) => {
      if (obj.selectable !== false) this.canvas.remove(obj);
    });
    this.mesas.forEach((mesa) => this.dibujarMesa(mesa));
    this.canvas.renderAll();
  }

  dibujarMesa(mesa: Table) {
    const xPx = mesa.pos_x ?? this.canvasWidth  / 2;
    const yPx = mesa.pos_y ?? this.canvasHeight / 2;

    const grupoMesa = new Group([], {
      selectable:     true,
      originX:        'center',
      originY:        'center',
      subTargetCheck: true,
      interactive:    true,
    } as any);

    const radio          = 60;
    const esPresidencial = mesa.shape === 'rectangular';

    const circuloMesa = new Circle({
      radius:      radio,
      fill:        esPresidencial ? '#d4af37' : '#ffffff',
      stroke:      '#333',
      strokeWidth: 3,
      originX:     'center',
      originY:     'center',
      evented:     false,
    });
    grupoMesa.add(circuloMesa);

    const textoNombre = new Text(mesa.name, {
      fontSize:   14,
      fontFamily: 'Playfair Display',
      fill:       esPresidencial ? '#ffffff' : '#333',
      originX:    'center',
      originY:    'center',
      top:        -8,
      evented:    false,
    });
    grupoMesa.add(textoNombre);

    const ocupados     = mesa.guests?.length ?? mesa.occupied ?? 0;
    const textoContador = new Text(`${ocupados}/${mesa.max_capacity}`, {
      fontSize:   12,
      fontFamily: 'Arial',
      fill:       '#666',
      originX:    'center',
      originY:    'center',
      top:        12,
      evented:    false,
    });
    grupoMesa.add(textoContador);

    if (mesa.guests && mesa.guests.length > 0) {
      mesa.guests.forEach((guest, index) => {
        this.dibujarInvitadoEnMesa(grupoMesa, guest, index, mesa.guests!.length, radio);
      });
    }

    grupoMesa.set({ left: xPx, top: yPx });
    grupoMesa.set('data', { tipo: 'mesa', mesaId: mesa.id, mesa });

    this.canvas.add(grupoMesa);
    grupoMesa.setCoords();
    this.canvas.renderAll();
  }

  dibujarInvitadoEnMesa(
    grupo:     Group,
    guest:     GuestSummary,
    index:     number,
    total:     number,
    radioMesa: number,
  ) {
    const angulo   = (360 / total) * index;
    const radianes = (angulo * Math.PI) / 180;
    const distancia = radioMesa + 35;
    const x = Math.cos(radianes) * distancia;
    const y = Math.sin(radianes) * distancia;

    const circulo = new Circle({
      radius:      20,
      fill:        this.getColorPorGrupo(guest.group),
      stroke:      guest.rsvp_status === 'confirmed' ? '#27ae60' : '#e74c3c',
      strokeWidth: 3,
      left:        x, top: y,
      originX:     'center', originY: 'center',
      selectable:  false, evented: false,
    });

    const iniciales = this.obtenerIniciales(this.getNombreCompleto(guest));
    const texto     = new Text(iniciales, {
      fontSize: 11, fontWeight: 'bold', fill: '#fff',
      left: x, top: y,
      originX: 'center', originY: 'center',
      selectable: false, evented: false,
    });

    grupo.add(circulo);
    grupo.add(texto);
  }

  // ─── Posición ─────────────────────────────────────────────────

  guardarPosicionMesa(objeto: FabricMesaGroup) {
    const gridSize = 25;
    const ajL = Math.round(objeto.left! / gridSize) * gridSize;
    const ajT = Math.round(objeto.top!  / gridSize) * gridSize;
    objeto.set({ left: ajL, top: ajT });
    objeto.setCoords();
    this.canvas.renderAll();
    this.guardarPosicionSubject.next(objeto);
  }

  guardarPosicionMesaEnBackend(objeto: FabricMesaGroup) {
    const mesaId = objeto.data?.mesaId;
    if (!mesaId) return;

    const gridSize = 25;
    const pos_x    = Math.round(objeto.left! / gridSize) * gridSize;
    const pos_y    = Math.round(objeto.top!  / gridSize) * gridSize;

    // FIX: usar PlanoService
    this.planoService.actualizarPosicionMesa(mesaId, pos_x, pos_y).subscribe({
      next:  () => console.log('✅ Posición guardada'),
      error: (err) => {
        console.error('Error al guardar posición:', err);
        this.cargarPlano();
      },
    });
  }

  // ─── Selección ────────────────────────────────────────────────

  seleccionarMesa(mesaId: string) {
    this.mesaSeleccionada    = this.mesas.find((m) => m.id === mesaId) || null;
    this.listaInvitadosAbierta = false;
    this.limpiarBusqueda();
  }

  toggleListaInvitados() {
    this.listaInvitadosAbierta = !this.listaInvitadosAbierta;
  }

  // ─── Invitados ────────────────────────────────────────────────

  filtrarInvitados() {
    if (!this.busquedaInvitado?.trim()) { this.invitadosFiltrados = []; return; }
    const term = this.busquedaInvitado.toLowerCase().trim();
    this.invitadosFiltrados = this.invitadosDisponibles
      .filter((inv) => {
        const nombre = this.getNombreCompleto(inv).toLowerCase();
        return nombre.includes(term) && !(inv as any).table_id;
      })
      .slice(0, 5);
  }

  seleccionarInvitado(inv: GuestSummary) {
    this.invitadoSeleccionado = inv;
    this.busquedaInvitado     = this.getNombreCompleto(inv);
    this.invitadosFiltrados   = [];
  }

  limpiarBusqueda() {
    this.invitadoSeleccionado = null;
    this.busquedaInvitado     = '';
    this.invitadosFiltrados   = [];
  }

  agregarInvitadoAMesa() {
    if (!this.mesaSeleccionada || !this.invitadoSeleccionado) {
      this.notifService.showError('Error', 'Selecciona una mesa y un invitado');
      return;
    }

    // FIX: usar PlanoService
    this.planoService
      .asignarInvitadoAMesa(this.mesaSeleccionada.id, this.invitadoSeleccionado.id)
      .subscribe({
        next: () => {
          this.notifService.showSuccess('¡Éxito!', 'Invitado asignado a la mesa');
          this.limpiarBusqueda();
          this.cargarPlano();
        },
        error: (err) => {
          this.notifService.showError('Error', err.error?.message || 'No se pudo asignar');
        },
      });
  }

  quitarInvitadoDeMesa(guestId: string) {
    if (!this.mesaSeleccionada) return;

    this.notifService
      .askConfirmation('Quitar invitado', '¿Deseas quitar este invitado de la mesa?', 'warning')
      .then((confirm) => {
        if (!confirm) return;

        // FIX: usar PlanoService
        this.planoService
          .quitarInvitadoDeMesa(this.mesaSeleccionada!.id, guestId)
          .subscribe({
            next:  () => {
              this.notifService.showSuccess('¡Listo!', 'Invitado quitado de la mesa');
              this.cargarPlano();
            },
            error: () => this.notifService.showError('Error', 'No se pudo quitar el invitado'),
          });
      });
  }

  // FIX: antes bloqueaba si había invitados — el backend hace SetNull automáticamente
  // Ahora informa al usuario de los invitados que quedarán sin mesa y deja proceder
  eliminarMesa() {
    if (!this.mesaSeleccionada) return;

    const ocupados = this.mesaSeleccionada.guests?.length ?? 0;
    const mensaje  = ocupados > 0
      ? `La mesa "${this.mesaSeleccionada.name}" tiene ${ocupados} invitado(s). Quedarán sin mesa asignada. ¿Continuar?`
      : `¿Eliminar la mesa "${this.mesaSeleccionada.name}"?`;

    this.notifService.askConfirmation('Eliminar mesa', mensaje, 'delete').then((confirm) => {
      if (!confirm) return;

      // FIX: usar PlanoService
      this.planoService.eliminarMesa(this.mesaSeleccionada!.id).subscribe({
        next: (res: any) => {
          const liberados = res?.data?.guests_released ?? 0;
          const msg       = liberados > 0
            ? `Mesa eliminada. ${liberados} invitado(s) han quedado sin mesa.`
            : 'Mesa eliminada correctamente.';
          this.notifService.showSuccess('¡Eliminada!', msg);
          this.mesaSeleccionada = null;
          this.cargarPlano();
        },
        error: () => this.notifService.showError('Error', 'No se pudo eliminar la mesa'),
      });
    });
  }

  agregarMesa() {
    const payload = {
      name:         `Mesa ${this.mesas.length + 1}`,
      shape:        'round' as const,
      max_capacity: 8,
      pos_x:        this.canvasWidth  / 2,
      pos_y:        this.canvasHeight / 2,
    };

    // FIX: usar PlanoService
    this.planoService.agregarMesa(this.weddingId, payload).subscribe({
      next:  () => {
        this.notifService.showSuccess('¡Éxito!', 'Mesa añadida en el centro');
        this.cargarPlano();
      },
      error: () => this.notifService.showError('Error', 'No se pudo crear la mesa'),
    });
  }

  // ─── Modal invitado ───────────────────────────────────────────

  mostrarModalInvitado(invitado: GuestSummary) {
    this.invitadoModalInfo  = invitado;
    this.modalJustOpened    = true;
    setTimeout(() => { this.modalJustOpened = false; }, 300);
  }

  cerrarModalInvitado() {
    if (this.modalJustOpened) return;
    this.invitadoModalInfo = null;
  }

  cerrarModalForzado() {
    this.modalJustOpened   = false;
    this.invitadoModalInfo = null;
  }

  // ─── Modo edición ─────────────────────────────────────────────

  toggleModoEdicion() {
    this.modoEdicion         = !this.modoEdicion;
    this.canvas.selection    = this.modoEdicion;
    this.canvas.forEachObject((obj: any) => {
      if (obj.data?.tipo === 'mesa') {
        obj.selectable   = this.modoEdicion;
        obj.hasControls  = this.modoEdicion;
        obj.hasBorders   = this.modoEdicion;
      }
    });
    this.canvas.renderAll();
  }

  // ─── Helpers de template ──────────────────────────────────────

  obtenerIniciales(nombre: string): string {
    return nombre
      .split(' ')
      .map((n) => n.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }

  getNombreCompleto(guest: GuestSummary): string {
    return `${guest.first_name ?? ''} ${guest.last_name ?? ''}`.trim();
  }

  contarAsientosOcupados(mesa: Table): number {
    return mesa.guests?.length ?? 0;
  }

  getInvitadosDeMesa(mesa: Table): GuestSummary[] {
    return mesa?.guests ?? [];
  }

  // FIX: ahora usa inv.group que existe en BD
  getColorPorGrupo(grupo: string | null | undefined): string {
    return GROUP_COLORS[grupo?.toLowerCase() ?? ''] ?? GROUP_COLORS['otro'];
  }
}