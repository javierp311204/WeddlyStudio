import {
  Component, OnInit, ViewChild, ElementRef,
  AfterViewInit, OnDestroy, NgZone, HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Canvas, Circle, Group, Text, Pattern, Rect } from 'fabric';
import { NotificationService } from '../../services/notification/notification.service';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { PlanoService, Table, GuestSummary } from '../../services/plano/plano.service';
import { environment } from '../../../enviroments/environment';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IconComponent } from '../../shared/icons/icon.component';
import { AiService } from '../../services/ai/ai.service';

// ─── jsPDF (importación dinámica para lazy-loading) ───────────────────────────
// Se importa de forma dinámica en descargarPDF() para no penalizar el bundle
// si el usuario nunca usa la función. Si prefieres importación estática:
//   import jsPDF from 'jspdf';
// ─────────────────────────────────────────────────────────────────────────────

const GROUP_COLORS: Record<string, string> = {
  familia:  '#d4a373',
  amigos:   '#606c38',
  trabajo:  '#3a86ff',
  pareja:   '#e63946',
  otro:     '#6c757d',
};

interface FabricMesaGroup extends Group {
  data: { mesaId: string; tipo: string; mesa: Table; };
}

type HandleTipo = 'resize' | 'rotate' | 'none';

@Component({
  selector:    'app-plano-interactivo',
  standalone:  true,
  imports:     [CommonModule, FormsModule, HttpClientModule, TranslateModule , IconComponent],
  templateUrl: './plano-interactivo.component.html',
  styleUrl:    './plano-interactivo.component.css',
})
export class PlanoInteractivoComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvasElement', { static: false }) canvasElement!: ElementRef<HTMLCanvasElement>;

  canvas!: Canvas;
  mesas:     Table[] = [];
  weddingId: string  = '';

  weddingRole: string = 'guest';
  get puedeEditar(): boolean {
    return ['owner', 'co_organizer', 'planner'].includes(this.weddingRole);
  }

  canvasWidth  = 3000;
  canvasHeight = 2000;

  zoomActual = 1;
  zoomMin    = 0.2;
  zoomMax    = 3;
  zoomStep   = 0.1;

  modoEdicion       = false;
  mesaSeleccionada: Table | null = null;

  invitadosDisponibles: GuestSummary[] = [];
  invitadosFiltrados:   GuestSummary[] = [];
  busquedaInvitado:     string         = '';
  invitadoSeleccionado: GuestSummary | null = null;
  listaInvitadosAbierta = false;
  invitadoModalInfo:    GuestSummary | null = null;

  sugirendoIA    = false;
  mostrarModalIA = false;
  aiLimitReached = false;
  sugerenciaIA: { assignments: any[]; summary: string } | null = null;

  mostrarModalCrearMesa = false;
  errorCrearMesa        = false;
  nuevaMesa = {
    name:         '',
    max_capacity: 8,
    shape:        'round' as 'round' | 'rectangular' | 'presidential',
  };

  /** Controla el estado de carga del botón PDF */
  exportandoPDF = false;

  private guardarPosicionSubject  = new Subject<FabricMesaGroup>();
  private guardarCapacidadSubject = new Subject<{ mesaId: string; max_capacity: number }>();
  private apiUrl                  = environment.apiUrl;

  private isPanning      = false;
  private lastPanPoint   = { x: 0, y: 0 };
  private mouseDownPoint = { x: 0, y: 0 };

  private mesaConHandles: FabricMesaGroup | null = null;
  private handleActivo: HandleTipo = 'none';

  private resizeCapInicio  = 0;
  private resizeDistInicio = 0;

  private rotateAnguloInicio = 0;
  private rotateMouseAngulo  = 0;

  private hResize: Circle | null = null;
  private hRotate: Circle | null = null;
  private hLabel:  Text   | null = null;

  @HostListener('wheel', ['$event'])
  onHostWheel(e: WheelEvent) {
    const el = this.canvasElement?.nativeElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const sobreCanvas =
      e.clientX >= rect.left && e.clientX <= rect.right &&
      e.clientY >= rect.top  && e.clientY <= rect.bottom;
    if (!sobreCanvas) return;
    e.preventDefault();
    e.stopPropagation();

    const delta     = e.deltaY > 0 ? -this.zoomStep : this.zoomStep;
    const nuevoZoom = Math.min(this.zoomMax, Math.max(this.zoomMin,
      +(this.zoomActual + delta).toFixed(2)));
    if (nuevoZoom === this.zoomActual) return;
    this.zoomActual = nuevoZoom;

    const scaleX = this.canvasWidth  / rect.width;
    const scaleY = this.canvasHeight / rect.height;
    const point  = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    };
    this.canvas.zoomToPoint(point as any, this.zoomActual);
    this.canvas.renderAll();
  }

  constructor(
    private http:         HttpClient,
    private planoService: PlanoService,
    private notifService: NotificationService,
    private router:       Router,
    private ngZone:       NgZone,
    private translate:    TranslateService,
    private aiService:    AiService,
  ) {}

  private getHeaders() {
    const token = localStorage.getItem('token');
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  private t(key: string, params?: object): string {
    return this.translate.instant(key, params);
  }

  // ─── Lifecycle ────────────────────────────────────────────────

  ngOnInit() {
    this.weddingId   = localStorage.getItem('weddingId')   ?? '';
    this.weddingRole = localStorage.getItem('weddingRole') ?? 'guest';

    if (!this.weddingId) {
      this.notifService.showError(this.t('COMMON.ERROR'), this.t('PLANO.ERROR_LOAD'));
      this.router.navigate(['/home']);
      return;
    }

    this.guardarPosicionSubject.pipe(debounceTime(500)).subscribe((o) => {
      this.guardarPosicionMesaEnBackend(o);
    });

    this.guardarCapacidadSubject.pipe(debounceTime(700)).subscribe(({ mesaId, max_capacity }) => {
      this.planoService.actualizarMesa(mesaId, { max_capacity }).subscribe({
        next:  () => {},
        error: (err) => this.notifService.showError(
          this.t('COMMON.ERROR'),
          err.error?.message || this.t('PLANO.ERROR_UPDATE')
        ),
      });
    });
  }

  ngAfterViewInit() {
    this.inicializarCanvas();
    Promise.resolve().then(() => this.cargarPlano());
  }

  ngOnDestroy() {
    if (this.canvas) this.canvas.dispose();
    this.guardarPosicionSubject.complete();
    this.guardarCapacidadSubject.complete();
  }

  // ─── Canvas ───────────────────────────────────────────────────

  inicializarCanvas() {
    const el = this.canvasElement.nativeElement;
    this.canvas = new Canvas(el, {
      width:           this.canvasWidth,
      height:          this.canvasHeight,
      backgroundColor: '#fdfaf7',
      selection:       false,
    });
    this.dibujarGrid();
    this.registrarEventosCanvas(el);
  }

  private registrarEventosCanvas(el: HTMLCanvasElement) {

    this.canvas.on('mouse:down', (opt) => {
      const e      = (opt as any).e as MouseEvent;
      const target = (opt as any).target as any;
      this.mouseDownPoint = { x: e.clientX, y: e.clientY };

      if (target?.data?.tipo === 'handle-resize' || target?.data?.tipo === 'handle-rotate') {
        this.handleActivo = target.data.tipo === 'handle-resize' ? 'resize' : 'rotate';

        if (this.handleActivo === 'resize' && this.mesaConHandles) {
          const scena = this.clienteAEscena(e.clientX, e.clientY);
          const cx    = this.mesaConHandles.left ?? 0;
          const cy    = this.mesaConHandles.top  ?? 0;
          this.resizeDistInicio = Math.sqrt((scena.x - cx) ** 2 + (scena.y - cy) ** 2);
          this.resizeCapInicio  = this.mesaConHandles.data.mesa.max_capacity;
          el.style.cursor = 'ew-resize';
        }

        if (this.handleActivo === 'rotate' && this.mesaConHandles) {
          const scena = this.clienteAEscena(e.clientX, e.clientY);
          const cx    = this.mesaConHandles.left ?? 0;
          const cy    = this.mesaConHandles.top  ?? 0;
          this.rotateAnguloInicio = this.mesaConHandles.angle ?? 0;
          this.rotateMouseAngulo  = Math.atan2(scena.y - cy, scena.x - cx) * 180 / Math.PI;
          el.style.cursor = 'crosshair';
        }
        return;
      }

      if (target?.data?.tipo === 'mesa') return;

      this.quitarHandles();
      this.ngZone.run(() => { this.mesaSeleccionada = null; });
      this.isPanning    = true;
      this.lastPanPoint = { x: e.clientX, y: e.clientY };
      el.style.cursor   = 'grabbing';
    });

    this.canvas.on('mouse:move', (opt) => {
      const e = (opt as any).e as MouseEvent;

      if (this.handleActivo === 'resize' && this.mesaConHandles) {
        const scena   = this.clienteAEscena(e.clientX, e.clientY);
        const cx      = this.mesaConHandles.left ?? 0;
        const cy      = this.mesaConHandles.top  ?? 0;
        const distAct = Math.sqrt((scena.x - cx) ** 2 + (scena.y - cy) ** 2);
        const ratio   = distAct / Math.max(1, this.resizeDistInicio);
        const nuevaCap = Math.round(Math.max(1, Math.min(50, this.resizeCapInicio * ratio)));
        const mesa     = this.mesaConHandles.data.mesa;

        if (nuevaCap !== mesa.max_capacity) {
          mesa.max_capacity = nuevaCap;
          if (this.mesaSeleccionada?.id === mesa.id) {
            this.ngZone.run(() => { this.mesaSeleccionada = { ...mesa }; });
          }
          this.redibujarMesaConHandles(this.mesaConHandles, mesa);
          this.guardarCapacidadSubject.next({ mesaId: mesa.id, max_capacity: nuevaCap });
        }
        return;
      }

      if (this.handleActivo === 'rotate' && this.mesaConHandles) {
        const scena  = this.clienteAEscena(e.clientX, e.clientY);
        const cx     = this.mesaConHandles.left ?? 0;
        const cy     = this.mesaConHandles.top  ?? 0;
        const angRat = Math.atan2(scena.y - cy, scena.x - cx) * 180 / Math.PI;
        const delta  = angRat - this.rotateMouseAngulo;
        const nuevo  = (this.rotateAnguloInicio + delta + 360) % 360;
        this.mesaConHandles.set({ angle: nuevo });
        this.mesaConHandles.setCoords();
        this.actualizarPosicionHandles(this.mesaConHandles);
        this.canvas.renderAll();
        return;
      }

      if (this.isPanning) {
        const dx = e.clientX - this.lastPanPoint.x;
        const dy = e.clientY - this.lastPanPoint.y;
        this.lastPanPoint = { x: e.clientX, y: e.clientY };
        const vpt = this.canvas.viewportTransform!;
        vpt[4] += dx;
        vpt[5] += dy;
        this.canvas.setViewportTransform(vpt);
        this.canvas.renderAll();
      }
    });

    this.canvas.on('mouse:up', (opt) => {
      const e      = (opt as any).e as MouseEvent;
      const target = (opt as any).target as any;

      if (this.handleActivo !== 'none') {
        if (this.handleActivo === 'rotate' && this.mesaConHandles) {
          this.guardarPosicionSubject.next(this.mesaConHandles);
        }
        this.handleActivo = 'none';
        el.style.cursor   = 'grab';
        return;
      }

      this.isPanning  = false;
      el.style.cursor = 'grab';

      const dx      = Math.abs(e.clientX - this.mouseDownPoint.x);
      const dy      = Math.abs(e.clientY - this.mouseDownPoint.y);
      const wasDrag = dx > 5 || dy > 5;

      if (!wasDrag && target?.data?.tipo === 'mesa') {
        const mesa   = (target as FabricMesaGroup).data.mesa;
        const guests = mesa.guests ?? [];

        if (guests.length > 0) {
          const scena  = this.clienteAEscena(e.clientX, e.clientY);
          const cx     = target.left ?? 0;
          const cy     = target.top  ?? 0;
          const angle  = ((target.angle ?? 0) * Math.PI) / 180;
          const dx2    = scena.x - cx;
          const dy2    = scena.y - cy;
          const localX =  dx2 * Math.cos(-angle) - dy2 * Math.sin(-angle);
          const localY =  dx2 * Math.sin(-angle) + dy2 * Math.cos(-angle);

          const hitGuest = this.calcularHitGuest(localX, localY, mesa);
          if (hitGuest) {
            this.ngZone.run(() => this.mostrarModalInvitado(hitGuest!));
            return;
          }
        }

        this.ngZone.run(() => this.seleccionarMesa((target as FabricMesaGroup).data.mesaId));
        if (this.puedeEditar && this.modoEdicion) {
          this.mostrarHandles(target as FabricMesaGroup);
        }
      }
    });

    this.canvas.on('object:modified', (options) => {
      const group = options.target as unknown as FabricMesaGroup;
      if (group?.data?.mesaId) {
        this.guardarPosicionMesa(group);
        if (this.mesaConHandles?.data?.mesaId === group.data.mesaId) {
          this.actualizarPosicionHandles(group);
        }
      }
    });
  }

  // ─── Handles ──────────────────────────────────────────────────

  private mostrarHandles(grupo: FabricMesaGroup) {
    this.quitarHandles();
    this.mesaConHandles = grupo;

    const mesa = grupo.data.mesa;
    const { hRotatePos, hResizePos } = this.calcularPosHandles(grupo, mesa);

    this.hRotate = new Circle({
      radius: 14, fill: '#6c5ce7', stroke: 'white', strokeWidth: 2.5,
      left: hRotatePos.x, top: hRotatePos.y,
      originX: 'center', originY: 'center',
      selectable: false, evented: true, hoverCursor: 'crosshair',
    } as any);
    (this.hRotate as any).data = { tipo: 'handle-rotate' };

    this.hResize = new Circle({
      radius: 14, fill: '#00b894', stroke: 'white', strokeWidth: 2.5,
      left: hResizePos.x, top: hResizePos.y,
      originX: 'center', originY: 'center',
      selectable: false, evented: true, hoverCursor: 'ew-resize',
    } as any);
    (this.hResize as any).data = { tipo: 'handle-resize' };

    const tRotate = new Text('↻', {
      fontSize: 16, fill: 'white', fontWeight: 'bold',
      left: hRotatePos.x, top: hRotatePos.y,
      originX: 'center', originY: 'center',
      selectable: false, evented: false,
    });
    (tRotate as any).data = { tipo: 'handle-label' };

    const tResize = new Text('↔', {
      fontSize: 14, fill: 'white', fontWeight: 'bold',
      left: hResizePos.x, top: hResizePos.y,
      originX: 'center', originY: 'center',
      selectable: false, evented: false,
    });
    (tResize as any).data = { tipo: 'handle-label' };

    this.hLabel = new Text(`${mesa.max_capacity} ${this.t('PLANO.PERSONS')}`, {
      fontSize: 12, fill: '#6c5ce7', fontWeight: 'bold',
      left: (hRotatePos.x + hResizePos.x) / 2,
      top:  (hRotatePos.y + hResizePos.y) / 2 - 16,
      originX: 'center', originY: 'center',
      selectable: false, evented: false,
      backgroundColor: 'rgba(255,255,255,0.85)',
      padding: 3,
    } as any);
    (this.hLabel as any).data = { tipo: 'handle-label' };

    [this.hRotate, this.hResize, tRotate, tResize, this.hLabel].forEach(o => {
      this.canvas.add(o as any);
    });

    this.canvas.renderAll();
  }

  private quitarHandles() {
    this.canvas.getObjects().forEach((obj: any) => {
      const t = obj.data?.tipo;
      if (t === 'handle-resize' || t === 'handle-rotate' || t === 'handle-label') {
        this.canvas.remove(obj);
      }
    });
    this.hRotate        = null;
    this.hResize        = null;
    this.hLabel         = null;
    this.mesaConHandles = null;
  }

  private calcularPosHandles(grupo: FabricMesaGroup, mesa: Table) {
    const angle = (grupo.angle ?? 0) * Math.PI / 180;
    const cx    = grupo.left ?? 0;
    const cy    = grupo.top  ?? 0;

    const esRect  = mesa.shape === 'rectangular';
    const mW      = esRect ? Math.max(100, Math.min(200, 80 + mesa.max_capacity * 6)) / 2 : 0;
    const mH      = esRect ? 70 / 2 : 0;
    const radio   = esRect ? 0 : (mesa.shape === 'presidential' ? 55 : Math.max(45, Math.min(80, 35 + mesa.max_capacity * 3)));
    const seatGap = 26;

    const rDist    = esRect ? Math.sqrt(mW * mW + mH * mH) + seatGap : radio + seatGap;
    const rotAngle = esRect ? Math.atan2(-mH, mW) : -Math.PI / 4;

    const hRotatePos = {
      x: cx + Math.cos(angle + rotAngle) * rDist,
      y: cy + Math.sin(angle + rotAngle) * rDist,
    };
    const hResizePos = {
      x: cx + Math.cos(angle + rotAngle + Math.PI) * rDist,
      y: cy + Math.sin(angle + rotAngle + Math.PI) * rDist,
    };

    return { hRotatePos, hResizePos };
  }

  private actualizarPosicionHandles(grupo: FabricMesaGroup) {
    if (!this.mesaConHandles || !this.hRotate || !this.hResize) return;
    const mesa = grupo.data.mesa;
    const { hRotatePos, hResizePos } = this.calcularPosHandles(grupo, mesa);

    this.hRotate.set({ left: hRotatePos.x, top: hRotatePos.y });
    this.hResize.set({ left: hResizePos.x, top: hResizePos.y });

    if (this.hLabel) {
      this.hLabel.set({
        left: (hRotatePos.x + hResizePos.x) / 2,
        top:  (hRotatePos.y + hResizePos.y) / 2 - 16,
        text: `${mesa.max_capacity} ${this.t('PLANO.PERSONS')}`,
      });
    }

    this.canvas.getObjects().forEach((obj: any) => {
      if (obj.data?.tipo === 'handle-label' && obj !== this.hLabel && obj.text) {
        if (obj.text === '↻') obj.set({ left: hRotatePos.x, top: hRotatePos.y });
        if (obj.text === '↔') obj.set({ left: hResizePos.x, top: hResizePos.y });
      }
    });

    this.canvas.renderAll();
  }

  private redibujarMesaConHandles(grupo: FabricMesaGroup, mesa: Table) {
    const angle = grupo.angle ?? 0;
    const left  = grupo.left  ?? 0;
    const top   = grupo.top   ?? 0;

    this.canvas.remove(grupo);
    this.dibujarMesa({ ...mesa, pos_x: left, pos_y: top });

    const nuevo = this.canvas.getObjects().find(
      (o: any) => o.data?.mesaId === mesa.id
    ) as unknown as FabricMesaGroup;

    if (nuevo) {
      nuevo.set({ angle });
      nuevo.setCoords();
      this.mesaConHandles = nuevo;
      this.actualizarPosicionHandles(nuevo);
      this.canvas.getObjects().forEach((o: any) => {
        if (['handle-resize', 'handle-rotate', 'handle-label'].includes(o.data?.tipo)) {
          this.canvas.bringObjectToFront(o);
        }
      });
    }

    this.canvas.renderAll();
  }

  // ─── Coordenadas ──────────────────────────────────────────────

  private clienteAEscena(clientX: number, clientY: number): { x: number; y: number } {
    const rect   = this.canvasElement.nativeElement.getBoundingClientRect();
    const zoom   = this.canvas.getZoom();
    const vpt    = this.canvas.viewportTransform!;
    const scaleX = this.canvasWidth  / rect.width;
    const scaleY = this.canvasHeight / rect.height;
    return {
      x: ((clientX - rect.left) * scaleX - vpt[4]) / zoom,
      y: ((clientY - rect.top)  * scaleY - vpt[5]) / zoom,
    };
  }

  // ─── Grid ─────────────────────────────────────────────────────

  dibujarGrid() {
    const gridSize      = 50;
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

  // ─── Zoom ─────────────────────────────────────────────────────

  acercar() {
    if (this.zoomActual >= this.zoomMax) return;
    this.zoomActual = Math.min(this.zoomMax, +(this.zoomActual + this.zoomStep).toFixed(2));
    this.aplicarZoom();
  }

  alejar() {
    if (this.zoomActual <= this.zoomMin) return;
    this.zoomActual = Math.max(this.zoomMin, +(this.zoomActual - this.zoomStep).toFixed(2));
    this.aplicarZoom();
  }

  private aplicarZoom() {
    const vpt = this.canvas.viewportTransform!;
    const cx  = (-vpt[4] + this.canvas.getWidth()  / 2);
    const cy  = (-vpt[5] + this.canvas.getHeight() / 2);
    this.canvas.zoomToPoint({ x: cx, y: cy } as any, this.zoomActual);
    this.canvas.renderAll();
  }

  get zoomPorcentaje(): number { return Math.round(this.zoomActual * 100); }

  // ─── Modal nueva mesa ─────────────────────────────────────────

  agregarMesa() {
    this.nuevaMesa      = { name: '', max_capacity: 8, shape: 'round' };
    this.errorCrearMesa = false;
    setTimeout(() => { this.mostrarModalCrearMesa = true; }, 50);
  }

  // ─── Carga de datos ───────────────────────────────────────────

  cargarPlano() {
    this.planoService.getPlano(this.weddingId).subscribe({
      next: (resTables) => {
        this.mesas = resTables?.data?.tables ?? [];
        this.http.get<any>(`${this.apiUrl}/weddings/${this.weddingId}/guests`, this.getHeaders()).subscribe({
          next: (resGuests) => {
            const todos: GuestSummary[] = resGuests?.data?.guests ?? resGuests?.guests ?? [];
            this.invitadosDisponibles   = todos;
            this.mesas.forEach((m) => {
              m.guests = todos.filter((g) => (g as any).table_id === m.id);
            });
            this.renderizarMesas();
          },
          error: () => this.renderizarMesas(),
        });
      },
      error: (err) => {
        console.error('Error al cargar plano:', err);
        this.notifService.showError(this.t('COMMON.ERROR'), this.t('PLANO.ERROR_LOAD'));
        this.renderizarMesas();
      },
    });
  }

  renderizarMesas() {
    this.quitarHandles();
    this.canvas.getObjects().forEach((obj: any) => {
      if (obj.data?.tipo === 'mesa') this.canvas.remove(obj);
    });
    this.mesas.forEach((mesa) => this.dibujarMesa(mesa));
    this.canvas.renderAll();
  }

  // ─── Dibujo de mesa ──────────────────────────────────────────

  dibujarMesa(mesa: Table) {
    const xPx   = mesa.pos_x ?? this.canvasWidth  / 2;
    const yPx   = mesa.pos_y ?? this.canvasHeight / 2;
    const angle = mesa.angle ?? 0;

    const grupoMesa = new Group([], {
      selectable:     this.modoEdicion,
      originX:        'center',
      originY:        'center',
      subTargetCheck: true,
      interactive:    true,
      hasControls:    false,
      hasBorders:     false,
    } as any);

    const esPresidencial = mesa.shape === 'presidential';
    const esRectangular  = mesa.shape === 'rectangular';
    const colorFondo = esPresidencial ? '#d4af37' : '#f5f0e8';
    const colorBorde = esPresidencial ? '#b8860b' : '#888';
    const colorTexto = esPresidencial ? '#fff'    : '#444';

    if (esRectangular) {
      const mW = Math.max(100, Math.min(200, 80 + mesa.max_capacity * 6));
      const mH = 70;
      grupoMesa.add(new Rect({
        width: mW, height: mH,
        fill: colorFondo, stroke: colorBorde, strokeWidth: 2,
        originX: 'center', originY: 'center', evented: false, rx: 4, ry: 4,
      }));
      grupoMesa.add(new Text(mesa.name, {
        fontSize: 12, fontFamily: 'Arial', fontWeight: 'bold', fill: colorTexto,
        originX: 'center', originY: 'center', top: -8, evented: false,
      }));
      grupoMesa.add(new Text(`${mesa.guests?.length ?? 0}/${mesa.max_capacity}`, {
        fontSize: 10, fontFamily: 'Arial', fill: colorTexto, opacity: 0.7,
        originX: 'center', originY: 'center', top: 8, evented: false,
      }));
      this.dibujarAsientosRectangulares(grupoMesa, mesa, mW, mH);
    } else {
      const radio = esPresidencial ? 55 : Math.max(45, Math.min(80, 35 + mesa.max_capacity * 3));
      grupoMesa.add(new Circle({
        radius: radio, fill: colorFondo, stroke: colorBorde, strokeWidth: 2,
        originX: 'center', originY: 'center', evented: false,
      }));
      grupoMesa.add(new Text(mesa.name, {
        fontSize: 12, fontFamily: 'Arial', fontWeight: 'bold', fill: colorTexto,
        originX: 'center', originY: 'center', top: -8, evented: false,
      }));
      grupoMesa.add(new Text(`${mesa.guests?.length ?? 0}/${mesa.max_capacity}`, {
        fontSize: 10, fontFamily: 'Arial', fill: colorTexto, opacity: 0.7,
        originX: 'center', originY: 'center', top: 8, evented: false,
      }));
      this.dibujarAsientosCirculares(grupoMesa, mesa, radio);
    }

    grupoMesa.set({ left: xPx, top: yPx, angle });
    grupoMesa.set('data', { tipo: 'mesa', mesaId: mesa.id, mesa });
    this.canvas.add(grupoMesa);
    grupoMesa.setCoords();
  }

  dibujarAsientosCirculares(grupo: Group, mesa: Table, radioMesa: number) {
    const total          = mesa.max_capacity;
    const guests         = mesa.guests ?? [];
    const distancia      = radioMesa + 14;
    const esPresidencial = mesa.shape === 'presidential';

    for (let i = 0; i < total; i++) {
      const angulo   = (360 / total) * i - 90;
      const radianes = (angulo * Math.PI) / 180;
      const cx       = Math.cos(radianes) * distancia;
      const cy       = Math.sin(radianes) * distancia;
      const guest    = guests[i] ?? null;
      const ocupado  = guest !== null;
      const fill     = ocupado ? this.getColorPorGrupo(guest.group) : (esPresidencial ? '#c9a227' : '#ccc');
      const stroke   = ocupado ? (guest.rsvp_status === 'confirmed' ? '#27ae60' : '#e74c3c') : (esPresidencial ? '#b8860b' : '#999');

      grupo.add(new Rect({
        width: 16, height: 10, fill, stroke, strokeWidth: 1.5,
        left: cx, top: cy, originX: 'center', originY: 'center',
        angle: angulo + 90, rx: 3, ry: 3, selectable: false, evented: false,
      }));
      if (ocupado) {
        grupo.add(new Text(this.obtenerIniciales(this.getNombreCompleto(guest)), {
          fontSize: 6, fontWeight: 'bold', fill: '#fff',
          left: cx, top: cy, originX: 'center', originY: 'center',
          angle: angulo + 90, selectable: false, evented: false,
        }));
      }
    }
  }

  dibujarAsientosRectangulares(grupo: Group, mesa: Table, mW: number, mH: number) {
    const total     = mesa.max_capacity;
    const guests    = mesa.guests ?? [];
    const gap       = 4;
    const porLado   = Math.max(1, Math.floor(total * 0.15));
    const porArriba = Math.floor((total - porLado * 2) / 2);
    const porAbajo  = total - porLado * 2 - porArriba;
    let seatIndex   = 0;

    const dibujarAsiento = (cx: number, cy: number, angulo: number) => {
      const guest   = guests[seatIndex] ?? null;
      const ocupado = guest !== null;
      const fill    = ocupado ? this.getColorPorGrupo(guest.group) : '#ccc';
      const stroke  = ocupado ? (guest.rsvp_status === 'confirmed' ? '#27ae60' : '#e74c3c') : '#999';
      grupo.add(new Rect({
        width: 16, height: 10, fill, stroke, strokeWidth: 1.5,
        left: cx, top: cy, originX: 'center', originY: 'center',
        angle: angulo, rx: 3, ry: 3, selectable: false, evented: false,
      }));
      if (ocupado && guest) {
        grupo.add(new Text(this.obtenerIniciales(this.getNombreCompleto(guest)), {
          fontSize: 6, fontWeight: 'bold', fill: '#fff',
          left: cx, top: cy, originX: 'center', originY: 'center',
          angle: angulo, selectable: false, evented: false,
        }));
      }
      seatIndex++;
    };

    const espaciadoH = mW / (porArriba + 1);
    const espaciadoV = mH / (porLado   + 1);

    for (let i = 1; i <= porArriba; i++) dibujarAsiento(-mW/2 + espaciadoH*i, -mH/2 - gap - 5,  0);
    for (let i = 1; i <= porAbajo;  i++) dibujarAsiento(-mW/2 + espaciadoH*i,  mH/2 + gap + 5,  0);
    for (let i = 1; i <= porLado;   i++) dibujarAsiento(-mW/2 - gap - 5, -mH/2 + espaciadoV*i, 90);
    for (let i = 1; i <= porLado;   i++) dibujarAsiento( mW/2 + gap + 5, -mH/2 + espaciadoV*i, 90);
  }

  calcularHitGuest(localX: number, localY: number, mesa: Table): GuestSummary | null {
    const guests        = mesa.guests ?? [];
    if (guests.length === 0) return null;

    const esRectangular  = mesa.shape === 'rectangular';
    const esPresidencial = mesa.shape === 'presidential';
    const radioMesa      = esPresidencial ? 55 : Math.max(45, Math.min(80, 35 + mesa.max_capacity * 3));
    const mW             = Math.max(100, Math.min(200, 80 + mesa.max_capacity * 6));
    const mH             = 70;
    const hit            = 14;

    if (esRectangular) {
      const porLado    = Math.max(1, Math.floor(mesa.max_capacity * 0.15));
      const porArriba  = Math.floor((mesa.max_capacity - porLado * 2) / 2);
      const porAbajo   = mesa.max_capacity - porLado * 2 - porArriba;
      const espaciadoH = mW / (porArriba + 1);
      const espaciadoV = mH / (porLado + 1);
      const gap = 4;
      const seats: { cx: number; cy: number }[] = [];
      for (let i = 1; i <= porArriba; i++) seats.push({ cx: -mW/2 + espaciadoH*i, cy: -mH/2 - gap - 5 });
      for (let i = 1; i <= porAbajo;  i++) seats.push({ cx: -mW/2 + espaciadoH*i, cy:  mH/2 + gap + 5 });
      for (let i = 1; i <= porLado;   i++) seats.push({ cx: -mW/2 - gap - 5,       cy: -mH/2 + espaciadoV*i });
      for (let i = 1; i <= porLado;   i++) seats.push({ cx:  mW/2 + gap + 5,       cy: -mH/2 + espaciadoV*i });
      for (let i = 0; i < guests.length; i++) {
        const s = seats[i];
        if (!s) break;
        if (Math.sqrt((localX - s.cx) ** 2 + (localY - s.cy) ** 2) <= hit) return guests[i];
      }
    } else {
      const dist = radioMesa + 14;
      for (let i = 0; i < guests.length; i++) {
        const ang = (360 / mesa.max_capacity) * i - 90;
        const rad = (ang * Math.PI) / 180;
        const cx  = Math.cos(rad) * dist;
        const cy  = Math.sin(rad) * dist;
        if (Math.sqrt((localX - cx) ** 2 + (localY - cy) ** 2) <= hit) return guests[i];
      }
    }
    return null;
  }

  // ─── Guardar posición ─────────────────────────────────────────

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
    const pos_x    = Math.round((objeto.left ?? 0) / gridSize) * gridSize;
    const pos_y    = Math.round((objeto.top  ?? 0) / gridSize) * gridSize;
    const angle    = +(objeto.angle ?? 0).toFixed(2);

    this.planoService.actualizarPosicionMesa(mesaId, pos_x, pos_y, angle).subscribe({
      next:  () => console.log('✅ Posición guardada', pos_x, pos_y, angle),
      error: (err) => { console.error('Error al guardar posición:', err); this.cargarPlano(); },
    });
  }

  // ─── Selección ────────────────────────────────────────────────

  seleccionarMesa(mesaId: string) {
    this.mesaSeleccionada      = this.mesas.find((m) => m.id === mesaId) || null;
    this.listaInvitadosAbierta = false;
    this.limpiarBusqueda();
  }

  toggleListaInvitados() { this.listaInvitadosAbierta = !this.listaInvitadosAbierta; }

  // ─── Modo edición ─────────────────────────────────────────────

  toggleModoEdicion() {
    this.modoEdicion = !this.modoEdicion;
    this.quitarHandles();
    this.canvas.selection = false;
    this.canvas.forEachObject((obj: any) => {
      if (obj.data?.tipo === 'mesa') {
        obj.selectable  = this.modoEdicion;
        obj.hasControls = false;
        obj.hasBorders  = false;
      }
    });
    this.canvas.renderAll();
  }

  // ─── Invitados ────────────────────────────────────────────────

  filtrarInvitados() {
    if (!this.busquedaInvitado?.trim()) { this.invitadosFiltrados = []; return; }
    const term = this.busquedaInvitado.toLowerCase().trim();
    this.invitadosFiltrados = this.invitadosDisponibles
      .filter((inv) => this.getNombreCompleto(inv).toLowerCase().includes(term) && !(inv as any).table_id)
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
      this.notifService.showError(this.t('COMMON.ERROR'), this.t('TABLES.SELECT_GUEST_AND_TABLE'));
      return;
    }
    this.planoService.asignarInvitadoAMesa(this.mesaSeleccionada.id, this.invitadoSeleccionado.id).subscribe({
      next: () => {
        this.notifService.showSuccess(this.t('COMMON.SUCCESS'), this.t('TABLES.GUEST_ASSIGNED'));
        this.limpiarBusqueda();
        this.cargarPlano();
      },
      error: (err) => {
        this.notifService.showError(this.t('COMMON.ERROR'), err.error?.message || this.t('PLANO.ERROR_UPDATE'));
      },
    });
  }

  quitarInvitadoDeMesa(guestId: string) {
    if (!this.mesaSeleccionada) return;
    this.notifService.askConfirmation(
      this.t('TABLES.REMOVE_GUEST_TITLE'),
      this.t('TABLES.REMOVE_GUEST_DESC'),
      'warning'
    ).then((confirm) => {
      if (!confirm) return;
      this.planoService.quitarInvitadoDeMesa(this.mesaSeleccionada!.id, guestId).subscribe({
        next: () => {
          this.notifService.showSuccess(this.t('TABLES.GUEST_REMOVED_TITLE'), this.t('TABLES.GUEST_REMOVED_DESC'));
          this.cargarPlano();
        },
        error: () => this.notifService.showError(this.t('COMMON.ERROR'), this.t('TABLES.GUEST_REMOVE_ERROR')),
      });
    });
  }

  eliminarMesa() {
    if (!this.mesaSeleccionada) return;
    const ocupados = this.mesaSeleccionada.guests?.length ?? 0;
    const mensaje  = ocupados > 0
      ? this.t('PLANO.DELETE_TABLE_WITH_GUESTS', { name: this.mesaSeleccionada.name, count: ocupados })
      : this.t('PLANO.DELETE_TABLE_CONFIRM', { name: this.mesaSeleccionada.name });

    this.notifService.askConfirmation(
      this.t('TABLES.DELETE_TABLE_TITLE'),
      mensaje,
      'delete'
    ).then((confirm) => {
      if (!confirm) return;
      this.planoService.eliminarMesa(this.mesaSeleccionada!.id).subscribe({
        next: (res: any) => {
          const liberados = res?.data?.guests_released ?? 0;
          const msg = liberados > 0
            ? this.t('PLANO.GUESTS_RELEASED', { count: liberados })
            : this.t('TABLES.TABLE_DELETED');
          this.notifService.showSuccess(this.t('COMMON.SUCCESS'), msg);
          this.mesaSeleccionada = null;
          this.quitarHandles();
          this.cargarPlano();
        },
        error: () => this.notifService.showError(this.t('COMMON.ERROR'), this.t('TABLES.TABLE_DELETE_ERROR')),
      });
    });
  }

  sugerirDistribucion(): void {
    if (this.sugirendoIA || this.aiLimitReached) return;
    this.sugirendoIA = true;
 
    this.aiService.suggestSeating(this.weddingId).subscribe({
      next: (res: any) => {
        this.sugirendoIA  = false;
        this.sugerenciaIA = {
          assignments: res?.data?.assignments ?? [],
          summary:     res?.data?.summary ?? '',
        };
        this.mostrarModalIA = true;
 
        const usage = res?.data?.usage;
        if (usage && !usage.unlimited) {
          this.aiLimitReached = (usage.remaining ?? 1) <= 0;
        }
      },
      error: (err: any) => {
        this.sugirendoIA = false;
        if (err?.error?.code === 'AI_LIMIT_REACHED') {
          this.aiLimitReached = true;
          this.notifService.showError('⚠️ Límite IA', 'Has agotado las sugerencias de este mes.');
        } else {
          this.notifService.showError(this.t('COMMON.ERROR'), 'Error al generar la distribución');
        }
      },
    });
  }
 
  cerrarModalIA(): void {
    this.mostrarModalIA = false;
    this.sugerenciaIA   = null;
  }
 
  getGuestNameById(guestId: string): string {
    const g = this.invitadosDisponibles.find(i => i.id === guestId);
    return g ? this.getNombreCompleto(g) : guestId;
  }
 
  getTableNameById(tableId: string): string {
    const t = this.mesas.find(m => m.id === tableId);
    return t?.name ?? tableId;
  }
 
  aplicarAsignacionIA(assignment: { guest_id: string; table_id: string }): void {
    this.planoService.asignarInvitadoAMesa(assignment.table_id, assignment.guest_id).subscribe({
      next: () => {
        this.notifService.showSuccess('✓', 'Invitado asignado correctamente');
        // Quitar de la lista de sugerencias
        if (this.sugerenciaIA) {
          this.sugerenciaIA.assignments = this.sugerenciaIA.assignments
            .filter(a => a.guest_id !== assignment.guest_id);
        }
        this.cargarPlano();
      },
      error: (err: any) => {
        this.notifService.showError(this.t('COMMON.ERROR'), err?.error?.message || 'Error al asignar');
      },
    });
  }
 
  rechazarAsignacionIA(assignment: { guest_id: string }): void {
    if (this.sugerenciaIA) {
      this.sugerenciaIA.assignments = this.sugerenciaIA.assignments
        .filter(a => a.guest_id !== assignment.guest_id);
    }
  }
 
  async aplicarTodasLasAsignaciones(): Promise<void> {
    if (!this.sugerenciaIA?.assignments?.length) return;
    const assignments = [...this.sugerenciaIA.assignments];
 
    for (const a of assignments) {
      try {
        await this.planoService.asignarInvitadoAMesa(a.table_id, a.guest_id).toPromise();
      } catch {}
    }
 
    this.notifService.showSuccess('✨', 'Distribución aplicada correctamente');
    this.cerrarModalIA();
    this.cargarPlano();
  }

  // ─── Modal crear mesa ─────────────────────────────────────────

  cerrarModalCrearMesa() { this.mostrarModalCrearMesa = false; this.errorCrearMesa = false; }

  confirmarCrearMesa() {
    if (!this.nuevaMesa.name?.trim() || !this.nuevaMesa.max_capacity) {
      this.errorCrearMesa = true;
      return;
    }
    const vpt  = this.canvas.viewportTransform!;
    const zoom = this.canvas.getZoom();
    const cx   = (-vpt[4] + this.canvas.getWidth()  / 2) / zoom;
    const cy   = (-vpt[5] + this.canvas.getHeight() / 2) / zoom;
    const payload = {
      name:         this.nuevaMesa.name.trim(),
      shape:        this.nuevaMesa.shape,
      max_capacity: this.nuevaMesa.max_capacity,
      pos_x:        Math.round(cx),
      pos_y:        Math.round(cy),
    };
    this.planoService.agregarMesa(this.weddingId, payload).subscribe({
      next: () => {
        this.notifService.showSuccess(
          this.t('COMMON.SUCCESS'),
          this.t('PLANO.TABLE_CREATED', { name: payload.name })
        );
        this.cerrarModalCrearMesa();
        this.cargarPlano();
      },
      error: (err) => {
        this.notifService.showError(this.t('COMMON.ERROR'), err.error?.message || this.t('TABLES.TABLE_ADD_ERROR'));
      },
    });
  }

  // ─── Modal invitado ───────────────────────────────────────────

  mostrarModalInvitado(invitado: GuestSummary) { this.invitadoModalInfo = invitado; }
  cerrarModalInvitado() { this.invitadoModalInfo = null; }
  cerrarModalForzado()  { this.invitadoModalInfo = null; }

  // ─── Helpers ──────────────────────────────────────────────────

  obtenerIniciales(nombre: string): string {
    return nombre.split(' ').map((n) => n.charAt(0).toUpperCase()).slice(0, 2).join('');
  }

  getNombreCompleto(guest: GuestSummary): string {
    return `${guest.first_name ?? ''} ${guest.last_name ?? ''}`.trim();
  }

  contarAsientosOcupados(mesa: Table): number { return mesa.guests?.length ?? 0; }
  getInvitadosDeMesa(mesa: Table): GuestSummary[] { return mesa?.guests ?? []; }

  getColorPorGrupo(grupo: string | null | undefined): string {
    return GROUP_COLORS[grupo?.toLowerCase() ?? ''] ?? GROUP_COLORS['otro'];
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ── EXPORTACIÓN A PDF ───────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Genera y descarga un PDF con:
   *   - Cabecera con título, fecha y estadísticas globales
   *   - Imagen del plano completo (zoom fit-to-page)
   *   - Tabla-resumen por mesa con ocupación y listado de invitados
   *   - Leyenda de colores por grupo
   *
   * Usa importación dinámica de jsPDF para no penalizar el bundle inicial.
   * Instala la dependencia con: npm install jspdf
   */
  async descargarPDF(): Promise<void> {
    if (this.exportandoPDF) return;
    this.exportandoPDF = true;

    try {
      // ── 1. Resolver todas las traducciones ANTES del await ───────────────
      // TranslateService.instant() funciona de forma síncrona solo si el
      // fichero de i18n ya ha sido cargado. Resolvemos aquí, antes del
      // import dinámico, para garantizar que las claves están disponibles.
      const i18n = {
        title:        this.t('PLANO.TITLE')            || 'Plano Interactivo del Salón',
        statTables:   this.t('PLANO.PDF_STAT_TABLES')  || 'Mesas',
        statCapacity: this.t('PLANO.PDF_STAT_CAPACITY')|| 'Capacidad total',
        statOccupied: this.t('PLANO.PDF_STAT_OCCUPIED')|| 'Asientos ocupados',
        statPct:      this.t('PLANO.PDF_STAT_PCT')     || 'Ocupación',
        summary:      this.t('PLANO.PDF_TABLE_SUMMARY')|| 'Resumen por mesa',
        legend:       this.t('PLANO.PDF_LEGEND')       || 'Leyenda:',
        colTable:     this.t('PLANO.PDF_COL_TABLE')    || 'Mesa',
        colCap:       this.t('PLANO.PDF_COL_CAPACITY') || 'Cap.',
        colOcc:       this.t('PLANO.PDF_COL_OCCUPIED') || 'Ocup.',
        colPct:       this.t('PLANO.PDF_COL_PCT')      || '%',
        colGuests:    this.t('PLANO.PDF_COL_GUESTS')   || 'Invitados asignados',
        footer:       this.t('PLANO.PDF_FOOTER')       || 'Plano del salón generado automáticamente',
      };

      // ── 2. Generar imagen de alta calidad ANTES del await ────────────────
      // toDataURL es síncrono en Fabric. Lo llamamos aquí para que el canvas
      // esté en su estado natural (sin interferencias del event loop).
      const canvasImgDataUrl = this.generarImagenCanvasFitContent();

      // ── 3. Importación dinámica ──────────────────────────────────────────
      const { default: jsPDF } = await import('jspdf');

      // ── 4. Constantes de página ──────────────────────────────────────────
      const PAGE_W   = 297;   // A4 landscape mm
      const PAGE_H   = 210;
      const MARGIN   = 14;
      const GOLD     = '#d4af37' as const;
      const DARK     = '#2c3e50' as const;
      const MUTED    = '#6b7280' as const;
      const date     = new Date().toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric'
      });

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      // ══════════════════════════════════════════════════════════════════════
      // PÁGINA 1 — Cabecera + plano
      // ══════════════════════════════════════════════════════════════════════

      // ── Cabecera dorada ──────────────────────────────────────────────────
      pdf.setFillColor(GOLD);
      pdf.rect(0, 0, PAGE_W, 22, 'F');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.setTextColor('#ffffff');
      pdf.text(i18n.title, MARGIN, 14);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(date, PAGE_W - MARGIN, 14, { align: 'right' });

      // ── Estadísticas globales ────────────────────────────────────────────
      const totalMesas     = this.mesas.length;
      const totalCapacidad = this.mesas.reduce((s, m) => s + m.max_capacity, 0);
      const totalOcupados  = this.mesas.reduce((s, m) => s + (m.guests?.length ?? 0), 0);
      const pctOcupacion   = totalCapacidad > 0
        ? Math.round((totalOcupados / totalCapacidad) * 100)
        : 0;

      const stats = [
        { label: i18n.statTables,   value: String(totalMesas) },
        { label: i18n.statCapacity, value: String(totalCapacidad) },
        { label: i18n.statOccupied, value: String(totalOcupados) },
        { label: i18n.statPct,      value: `${pctOcupacion}%` },
      ];

      let statX = MARGIN;
      const statY = 30;
      const statW = (PAGE_W - MARGIN * 2) / stats.length;

      stats.forEach((s) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(18);
        pdf.setTextColor(GOLD);
        pdf.text(s.value, statX + statW / 2, statY, { align: 'center' });

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(MUTED);
        pdf.text(s.label, statX + statW / 2, statY + 5, { align: 'center' });

        statX += statW;
      });

      // ── Separador ────────────────────────────────────────────────────────
      pdf.setDrawColor(GOLD);
      pdf.setLineWidth(0.4);
      pdf.line(MARGIN, 40, PAGE_W - MARGIN, 40);

      // ── Imagen del canvas (ya generada antes del await) ──────────────────
      const IMG_Y = 43;
      const IMG_H = PAGE_H - IMG_Y - MARGIN;
      const IMG_W = PAGE_W - MARGIN * 2;

      // 'NONE' = sin recompresión interna de jsPDF → máxima calidad
      pdf.addImage(canvasImgDataUrl, 'JPEG', MARGIN, IMG_Y, IMG_W, IMG_H, undefined, 'NONE');

      // Recuadro sobre la imagen
      pdf.setDrawColor('#cccccc');
      pdf.setLineWidth(0.3);
      pdf.rect(MARGIN, IMG_Y, IMG_W, IMG_H);

      // ══════════════════════════════════════════════════════════════════════
      // PÁGINA 2 — Resumen por mesa
      // ══════════════════════════════════════════════════════════════════════
      pdf.addPage();

      // Sub-cabecera
      pdf.setFillColor(GOLD);
      pdf.rect(0, 0, PAGE_W, 16, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor('#ffffff');
      pdf.text(i18n.summary, MARGIN, 11);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(date, PAGE_W - MARGIN, 11, { align: 'right' });

      // Leyenda de grupos (colores)
      this.dibujarLeyendaPDF(pdf, 20, MARGIN, i18n.legend, GOLD, DARK, MUTED);

      // Tabla de mesas
      this.dibujarTablaMesasPDF(pdf, 38, MARGIN, PAGE_W, PAGE_H, i18n, GOLD, DARK, MUTED);

      // ── Pie de página en todas las páginas ──────────────────────────────
      const totalPaginas = pdf.getNumberOfPages();
      for (let p = 1; p <= totalPaginas; p++) {
        pdf.setPage(p);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(MUTED);
        pdf.text(
          `${i18n.footer} — ${p} / ${totalPaginas}`,
          PAGE_W / 2,
          PAGE_H - 4,
          { align: 'center' }
        );
      }

      // ── Descargar ────────────────────────────────────────────────────────
      const fileName = `plano-salon-${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);

    } catch (err) {
      console.error('Error generando PDF:', err);
      this.notifService.showError(this.t('COMMON.ERROR'), this.t('PLANO.PDF_ERROR'));
    } finally {
      this.exportandoPDF = false;
    }
  }

  /**
   * Renderiza el canvas limitando la exportación al área con mesas.
   * - multiplier: 3 → 3× la resolución del canvas lógico = nitidez real
   * - format: jpeg + quality 0.92 → buen balance calidad/tamaño de archivo
   * - El viewport se resetea temporalmente a zoom 1 para capturar a máxima res
   */
  private generarImagenCanvasFitContent(): string {
    // ── Guardar estado del viewport ──────────────────────────────────────
    const vptOriginal = [...this.canvas.viewportTransform!] as number[];
    const zoomOriginal = this.canvas.getZoom();

    // ── Resetear a zoom 1 sin pan para exportar a resolución nativa ──────
    this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    this.canvas.renderAll();

    // ── Bounding box de todas las mesas ──────────────────────────────────
    const PAD = 80;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    this.canvas.getObjects().forEach((obj: any) => {
      if (obj.data?.tipo !== 'mesa') return;
      const b = obj.getBoundingRect(true);
      if (b.left            < minX) minX = b.left;
      if (b.top             < minY) minY = b.top;
      if (b.left + b.width  > maxX) maxX = b.left + b.width;
      if (b.top  + b.height > maxY) maxY = b.top  + b.height;
    });

    let dataUrl: string;

    if (!isFinite(minX)) {
      // Sin mesas: exportar todo a resolución decente
      dataUrl = this.canvas.toDataURL({ format: 'jpeg', quality: 0.92, multiplier: 1 });
    } else {
      const cropX = Math.max(0, minX - PAD);
      const cropY = Math.max(0, minY - PAD);
      const cropW = Math.min(this.canvasWidth,  maxX + PAD) - cropX;
      const cropH = Math.min(this.canvasHeight, maxY + PAD) - cropY;

      // multiplier:3 → renderiza 3× la resolución del área crop → muy nítido
      dataUrl = this.canvas.toDataURL({
        format:     'jpeg',
        quality:    0.95,
        multiplier: 3,
        left:       cropX,
        top:        cropY,
        width:      cropW,
        height:     cropH,
      });
    }

    // ── Restaurar viewport original ──────────────────────────────────────
    this.canvas.setViewportTransform(vptOriginal as any);
    this.canvas.renderAll();

    return dataUrl;
  }

  /** Dibuja la leyenda de colores de grupo en el PDF */
  private dibujarLeyendaPDF(
    pdf:    any,
    y:      number,
    margin: number,
    legendLabel: string,
    gold:   string,
    dark:   string,
    muted:  string,
  ): void {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(dark);
    pdf.text(legendLabel, margin, y);

    let lx = margin + 30;
    Object.entries(GROUP_COLORS).forEach(([grupo, color]) => {
      const [r, g, b] = this.hexToRgb(color);
      pdf.setFillColor(r, g, b);
      pdf.circle(lx, y - 1.5, 2.5, 'F');

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(muted);
      pdf.text(grupo.charAt(0).toUpperCase() + grupo.slice(1), lx + 4, y);

      lx += 30;
    });
  }

  /** Dibuja la tabla resumen de mesas con sus invitados */
  private dibujarTablaMesasPDF(
    pdf:    any,
    startY: number,
    margin: number,
    pageW:  number,
    pageH:  number,
    i18n:   Record<string, string>,
    gold:   string,
    dark:   string,
    muted:  string,
  ): void {
    const COL_W   = [55, 22, 22, 22, pageW - margin * 2 - 55 - 22 - 22 - 22];
    const ROW_H   = 7;
    const HEADERS = [
      i18n['colTable'],
      i18n['colCap'],
      i18n['colOcc'],
      i18n['colPct'],
      i18n['colGuests'],
    ];

    let y = startY;

    // Cabecera de tabla
    pdf.setFillColor(gold);
    let hx = margin;
    HEADERS.forEach((h, i) => {
      pdf.rect(hx, y, COL_W[i], ROW_H, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor('#ffffff');
      pdf.text(h, hx + 2, y + 4.8);
      hx += COL_W[i];
    });
    y += ROW_H;

    // Filas
    this.mesas.forEach((mesa, idx) => {
      // Salto de página si es necesario
      if (y + ROW_H > pageH - 14) {
        pdf.addPage();
        y = 20;
        // Re-dibujar cabecera en página nueva
        pdf.setFillColor(gold);
        let hxNew = margin;
        HEADERS.forEach((h, i) => {
          pdf.rect(hxNew, y, COL_W[i], ROW_H, 'F');
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(7.5);
          pdf.setTextColor('#ffffff');
          pdf.text(h, hxNew + 2, y + 4.8);
          hxNew += COL_W[i];
        });
        y += ROW_H;
      }

      const ocupados  = mesa.guests?.length ?? 0;
      const pct       = mesa.max_capacity > 0
        ? Math.round((ocupados / mesa.max_capacity) * 100)
        : 0;
      const guestList = (mesa.guests ?? [])
        .map((g) => this.getNombreCompleto(g))
        .join(', ') || '—';

      // Fondo alternado
      if (idx % 2 === 0) {
        pdf.setFillColor('#f9f7f1');
        pdf.rect(margin, y, pageW - margin * 2, ROW_H, 'F');
      }

      // Borde de fila
      pdf.setDrawColor('#e5e7eb');
      pdf.setLineWidth(0.2);
      pdf.rect(margin, y, pageW - margin * 2, ROW_H);

      // Datos
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(dark);
      pdf.text(mesa.name, margin + 2, y + 4.8);

      const cellData = [String(mesa.max_capacity), String(ocupados), `${pct}%`];
      let cx = margin + COL_W[0];
      cellData.forEach((val, ci) => {
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(ci === 2 && pct === 100 ? '#27ae60' : muted);
        pdf.text(val, cx + COL_W[ci + 1] / 2, y + 4.8, { align: 'center' });
        cx += COL_W[ci + 1];
      });

      // Lista de invitados (truncada si no cabe)
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.5);
      pdf.setTextColor(muted);
      const maxGuestW = COL_W[4] - 4;
      const truncated = pdf.splitTextToSize(guestList, maxGuestW)[0] ?? guestList;
      pdf.text(truncated, cx + 2, y + 4.8);

      y += ROW_H;
    });
  }

  /** Convierte hex (#rrggbb) a [r, g, b] para jsPDF */
  private hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [100, 100, 100];
  }
}