import {
  Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Canvas, Circle, Group, Text, Pattern } from 'fabric';
import { NotificationService } from '../../services/notification/notification.service';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';

// ─────────────────────────────────────────────────────────────
// MIGRACIÓN v2:
//  • PlanoService → sustituido por llamadas directas a v2 (adaptar al servicio)
//  • codigoBoda  → weddingId (UUID)
//  • mesa._id    → mesa.id
//  • inv._id     → inv.id
//  • inv.nombre  → inv.first_name + inv.last_name
//  • mesa.posicion.x/y → mesa.pos_x / mesa.pos_y (números directos, NO porcentaje)
//  • mesa.radio / mesa.asientos → en v2 la estructura de asientos no existe;
//    los invitados se listan por GET /api/weddings/:weddingId/guests?table_id=
//
//  Endpoints v2:
//  • GET  /api/weddings/:weddingId/tables       → lista de mesas
//  • GET  /api/weddings/:weddingId/guests       → invitados (filtrar por table_id)
//  • POST /api/weddings/:weddingId/tables       → crear mesa
//  • DELETE /api/tables/:tableId                → eliminar mesa (físico)
//  • PATCH  /api/tables/:tableId/position       → { pos_x, pos_y }
//  • PATCH  /api/tables/:tableId/assign         → { guest_id }
//  • PATCH  /api/tables/:tableId/unassign/:guestId
//
//  IMPORTANTE: v2 usa pos_x/pos_y en píxeles directos (no porcentaje).
//  Se conserva la lógica de posicionamiento adaptada.
// ─────────────────────────────────────────────────────────────

interface MesaV2 {
  id: string;
  name: string;
  shape: 'round' | 'rectangular';
  max_capacity: number;
  pos_x: number;
  pos_y: number;
  occupied?: number;
  available?: number;
  is_full?: boolean;
  guests?: any[];
}

interface FabricMesaGroup extends Group {
  data: {
    mesaId: string;
    tipo: string;
    mesa: MesaV2;
  };
}

@Component({
  selector: 'app-plano-interactivo',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './plano-interactivo.component.html',
  styleUrl: './plano-interactivo.component.css',
})
export class PlanoInteractivoComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvasElement', { static: false }) canvasElement!: ElementRef<HTMLCanvasElement>;

  canvas!: Canvas;
  mesas: MesaV2[] = [];
  weddingId: string = '';

  canvasWidth = 1200;
  canvasHeight = 800;

  modoEdicion = true;
  mesaSeleccionada: MesaV2 | null = null;

  invitadosDisponibles: any[] = [];
  invitadosFiltrados: any[] = [];
  busquedaInvitado: string = '';
  invitadoSeleccionado: any = null;
  listaInvitadosAbierta: boolean = false;
  invitadoModalInfo: any = null;

  private modalJustOpened = false;
  private guardarPosicionSubject = new Subject<FabricMesaGroup>();
  private apiUrl = 'http://localhost:3000/api';

  constructor(
    private http: HttpClient,
    private notifService: NotificationService,
    private router: Router,
    private ngZone: NgZone,
  ) {}

  private getHeaders() {
    const token = localStorage.getItem('token');
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  ngOnInit() {
    this.weddingId = localStorage.getItem('weddingId') || '';
    if (!this.weddingId) {
      this.notifService.showError('Error', 'No se encontró weddingId');
      this.router.navigate(['/home']);
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
      this.canvasElement.nativeElement.addEventListener('mouseup', (e) => e.stopPropagation(), true);
    }
  }

  ngOnDestroy() {
    if (this.canvas) this.canvas.dispose();
    this.guardarPosicionSubject.complete();
  }

  inicializarCanvas() {
    this.canvas = new Canvas(this.canvasElement.nativeElement, {
      width: this.canvasWidth,
      height: this.canvasHeight,
      backgroundColor: '#fdfaf7',
      selection: this.modoEdicion,
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
      const obj = e.target!;
      const halfW = obj.getScaledWidth() / 2;
      const halfH = obj.getScaledHeight() / 2;
      if (obj.left! < halfW) obj.left = halfW;
      if (obj.top! < halfH) obj.top = halfH;
      if (obj.left! > this.canvasWidth - halfW) obj.left = this.canvasWidth - halfW;
      if (obj.top! > this.canvasHeight - halfH) obj.top = this.canvasHeight - halfH;
    });
  }

  dibujarGrid() {
    const gridSize = 50;
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = gridSize;
    patternCanvas.height = gridSize;
    const ctx = patternCanvas.getContext('2d')!;
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, gridSize, gridSize);
    const pattern = new Pattern({ source: patternCanvas as any, repeat: 'repeat' });
    this.canvas.set({ backgroundColor: pattern });
    this.canvas.renderAll();
  }

  cargarPlano() {
    // v2: GET /api/weddings/:weddingId/tables → { tables, summary }
    this.http
      .get<any>(`${this.apiUrl}/weddings/${this.weddingId}/tables`, this.getHeaders())
      .subscribe({
        next: (resTables) => {
          this.mesas = resTables?.data?.tables ?? resTables?.tables ?? [];

          // v2: GET /api/weddings/:weddingId/guests para invitados sin mesa
          this.http
            .get<any>(`${this.apiUrl}/weddings/${this.weddingId}/guests`, this.getHeaders())
            .subscribe({
              next: (resGuests) => {
                const todos = resGuests?.data?.guests ?? resGuests?.guests ?? [];
                this.invitadosDisponibles = todos;

                // Asociar invitados a mesas
                this.mesas.forEach((mesa) => {
                  mesa.guests = todos.filter((g: any) => g.table_id === mesa.id);
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

  dibujarMesa(mesa: MesaV2) {
    // v2: pos_x/pos_y en píxeles directos
    const xPx = mesa.pos_x ?? this.canvasWidth / 2;
    const yPx = mesa.pos_y ?? this.canvasHeight / 2;

    const grupoMesa = new Group([], {
      selectable: true,
      originX: 'center',
      originY: 'center',
      subTargetCheck: true,
      interactive: true,
    } as any);

    const radio = 60;
    const esPresidencial = mesa.shape === 'rectangular';

    const circuloMesa = new Circle({
      radius: radio,
      fill: esPresidencial ? '#d4af37' : '#ffffff',
      stroke: '#333',
      strokeWidth: 3,
      originX: 'center',
      originY: 'center',
      evented: false,
    });
    grupoMesa.add(circuloMesa);

    // v2: mesa.name en lugar de mesa.nombre
    const textoNombre = new Text(mesa.name, {
      fontSize: 14,
      fontFamily: 'Playfair Display',
      fill: esPresidencial ? '#ffffff' : '#333',
      originX: 'center',
      originY: 'center',
      top: -8,
      evented: false,
    });
    grupoMesa.add(textoNombre);

    // v2: occupied/max_capacity
    const ocupados = mesa.guests?.length ?? mesa.occupied ?? 0;
    const textoContador = new Text(`${ocupados}/${mesa.max_capacity}`, {
      fontSize: 12,
      fontFamily: 'Arial',
      fill: '#666',
      originX: 'center',
      originY: 'center',
      top: 12,
      evented: false,
    });
    grupoMesa.add(textoContador);

    // Dibujar invitados alrededor
    if (mesa.guests && mesa.guests.length > 0) {
      mesa.guests.forEach((guest: any, index: number) => {
        this.dibujarInvitadoEnMesa(grupoMesa, guest, index, mesa.guests!.length, radio);
      });
    }

    grupoMesa.set({ left: xPx, top: yPx });
    grupoMesa.set('data', { tipo: 'mesa', mesaId: mesa.id, mesa });

    this.canvas.add(grupoMesa);
    grupoMesa.setCoords();
    this.canvas.renderAll();
  }

  dibujarInvitadoEnMesa(grupo: Group, guest: any, index: number, total: number, radioMesa: number) {
    const angulo = (360 / total) * index;
    const radianes = (angulo * Math.PI) / 180;
    const distancia = radioMesa + 35;
    const x = Math.cos(radianes) * distancia;
    const y = Math.sin(radianes) * distancia;

    const circulo = new Circle({
      radius: 20,
      fill: '#3498db',
      stroke: guest.rsvp_status === 'confirmed' ? '#27ae60' : '#e74c3c',
      strokeWidth: 3,
      left: x, top: y,
      originX: 'center', originY: 'center',
      selectable: false,
      evented: false,
    });

    // v2: iniciales de first_name + last_name
    const iniciales = this.obtenerIniciales(`${guest.first_name} ${guest.last_name}`);
    const texto = new Text(iniciales, {
      fontSize: 11, fontWeight: 'bold', fill: '#fff',
      left: x, top: y,
      originX: 'center', originY: 'center',
      selectable: false, evented: false,
    });

    grupo.add(circulo);
    grupo.add(texto);
  }

  guardarPosicionMesa(objeto: FabricMesaGroup) {
    const gridSize = 25;
    const ajL = Math.round(objeto.left! / gridSize) * gridSize;
    const ajT = Math.round(objeto.top! / gridSize) * gridSize;
    objeto.set({ left: ajL, top: ajT });
    objeto.setCoords();
    this.canvas.renderAll();
    this.guardarPosicionSubject.next(objeto);
  }

  guardarPosicionMesaEnBackend(objeto: FabricMesaGroup) {
    const mesaId = objeto.data?.mesaId;
    if (!mesaId) return;

    const gridSize = 25;
    const pos_x = Math.round(objeto.left! / gridSize) * gridSize;
    const pos_y = Math.round(objeto.top! / gridSize) * gridSize;

    // v2: PATCH /api/tables/:tableId/position  { pos_x, pos_y }
    this.http
      .patch(`${this.apiUrl}/tables/${mesaId}/position`, { pos_x, pos_y }, this.getHeaders())
      .subscribe({
        next: () => console.log('✅ Posición guardada'),
        error: (err) => {
          console.error('Error al guardar posición:', err);
          this.cargarPlano();
        },
      });
  }

  seleccionarMesa(mesaId: string) {
    this.mesaSeleccionada = this.mesas.find((m) => m.id === mesaId) || null;
    this.listaInvitadosAbierta = false;
    this.limpiarBusqueda();
  }

  toggleListaInvitados() {
    this.listaInvitadosAbierta = !this.listaInvitadosAbierta;
  }

  filtrarInvitados() {
    if (!this.busquedaInvitado?.trim()) { this.invitadosFiltrados = []; return; }
    const term = this.busquedaInvitado.toLowerCase().trim();
    this.invitadosFiltrados = this.invitadosDisponibles
      .filter((inv) => {
        const nombre = `${inv.first_name} ${inv.last_name}`.toLowerCase();
        return nombre.includes(term) && !inv.table_id;
      })
      .slice(0, 5);
  }

  seleccionarInvitado(inv: any) {
    this.invitadoSeleccionado = inv;
    this.busquedaInvitado = `${inv.first_name} ${inv.last_name}`.trim();
    this.invitadosFiltrados = [];
  }

  limpiarBusqueda() {
    this.invitadoSeleccionado = null;
    this.busquedaInvitado = '';
    this.invitadosFiltrados = [];
  }

  agregarInvitadoAMesa() {
    if (!this.mesaSeleccionada || !this.invitadoSeleccionado) {
      this.notifService.showError('Error', 'Selecciona una mesa y un invitado');
      return;
    }

    // v2: PATCH /api/tables/:tableId/assign  { guest_id }
    this.http
      .patch(
        `${this.apiUrl}/tables/${this.mesaSeleccionada.id}/assign`,
        { guest_id: this.invitadoSeleccionado.id },
        this.getHeaders()
      )
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

    this.notifService.askConfirmation('Quitar invitado', '¿Deseas quitar este invitado de la mesa?', 'warning')
      .then((confirm) => {
        if (confirm) {
          // v2: PATCH /api/tables/:tableId/unassign/:guestId
          this.http
            .patch(
              `${this.apiUrl}/tables/${this.mesaSeleccionada!.id}/unassign/${guestId}`,
              {},
              this.getHeaders()
            )
            .subscribe({
              next: () => {
                this.notifService.showSuccess('¡Listo!', 'Invitado quitado de la mesa');
                this.cargarPlano();
              },
              error: () => this.notifService.showError('Error', 'No se pudo quitar el invitado'),
            });
        }
      });
  }

  eliminarMesa() {
    if (!this.mesaSeleccionada) return;

    const ocupados = this.mesaSeleccionada.guests?.length ?? 0;
    if (ocupados > 0) {
      this.notifService.showError('Mesa ocupada', `Hay ${ocupados} invitado(s). Quítalos primero.`);
      return;
    }

    this.notifService.askConfirmation('Eliminar mesa', `¿Eliminar "${this.mesaSeleccionada.name}"?`, 'delete')
      .then((confirm) => {
        if (confirm) {
          // v2: DELETE /api/tables/:tableId
          this.http
            .delete(`${this.apiUrl}/tables/${this.mesaSeleccionada!.id}`, this.getHeaders())
            .subscribe({
              next: () => {
                this.notifService.showSuccess('¡Eliminada!', 'Mesa eliminada correctamente');
                this.mesaSeleccionada = null;
                this.cargarPlano();
              },
              error: () => this.notifService.showError('Error', 'No se pudo eliminar la mesa'),
            });
        }
      });
  }

  agregarMesa() {
    // v2: POST /api/weddings/:weddingId/tables
    const payload = {
      name: `Mesa ${this.mesas.length + 1}`,
      shape: 'round',
      max_capacity: 8,
      pos_x: this.canvasWidth / 2,
      pos_y: this.canvasHeight / 2,
    };

    this.http
      .post(`${this.apiUrl}/weddings/${this.weddingId}/tables`, payload, this.getHeaders())
      .subscribe({
        next: () => {
          this.notifService.showSuccess('¡Éxito!', 'Mesa añadida en el centro');
          this.cargarPlano();
        },
        error: () => this.notifService.showError('Error', 'No se pudo crear la mesa'),
      });
  }

  mostrarModalInvitado(invitado: any) {
    this.invitadoModalInfo = invitado;
    this.modalJustOpened = true;
    setTimeout(() => { this.modalJustOpened = false; }, 300);
  }

  cerrarModalInvitado() {
    if (this.modalJustOpened) return;
    this.invitadoModalInfo = null;
  }

  cerrarModalForzado() {
    this.modalJustOpened = false;
    this.invitadoModalInfo = null;
  }

  toggleModoEdicion() {
    this.modoEdicion = !this.modoEdicion;
    this.canvas.selection = this.modoEdicion;
    this.canvas.forEachObject((obj: any) => {
      if (obj.data?.tipo === 'mesa') {
        obj.selectable = this.modoEdicion;
        obj.hasControls = this.modoEdicion;
        obj.hasBorders = this.modoEdicion;
      }
    });
    this.canvas.renderAll();
  }

  // ─── Helpers ──────────────────────────────────────────────
  obtenerIniciales(nombre: string): string {
    return nombre.split(' ').map((n) => n.charAt(0).toUpperCase()).slice(0, 2).join('');
  }

  getNombreCompleto(guest: any): string {
    return `${guest.first_name || ''} ${guest.last_name || ''}`.trim();
  }

  contarAsientosOcupados(mesa: MesaV2): number {
    return mesa.guests?.length ?? 0;
  }

  irAlMenu() {
    this.router.navigate(['/home']);
  }

  // FIX NG9: método requerido por el template para listar invitados de una mesa
  // v2: los invitados de la mesa están en mesa.guests[] (filtrados por table_id en cargarPlano)
  getInvitadosDeMesa(mesa: MesaV2): any[] {
    return mesa?.guests ?? [];
  }

  // FIX NG9: método requerido por el template para colorear por grupo
  // v2: inv.group reemplaza a inv.tipo
  getColorPorGrupo(grupo: string): string {
    const colores: Record<string, string> = {
      familia:   '#d4a373',
      amigos:    '#606c38',
      trabajo:   '#3a86ff',
      pareja:    '#e63946',
      otro:      '#6c757d',
    };
    return colores[grupo?.toLowerCase()] ?? '#6c757d';
  }
}