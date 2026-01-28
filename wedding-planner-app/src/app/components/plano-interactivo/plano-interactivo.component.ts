import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Canvas, Circle, Line, Group, Text, TEvent, Pattern } from 'fabric';
import {
  PlanoService,
  Mesa,
  Asiento,
} from '../../services/plano/plano.service';
import { NotificationService } from '../../services/notification/notification.service';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

interface FabricMesaGroup extends Group {
  data: {
    mesaId: string;
    tipo: string;
    mesa: Mesa;
  };
}

@Component({
  selector: 'app-plano-interactivo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './plano-interactivo.component.html',
  styleUrl: './plano-interactivo.component.css',
})
export class PlanoInteractivoComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvasElement', { static: false })
  canvasElement!: ElementRef<HTMLCanvasElement>;

  canvas!: Canvas;
  mesas: Mesa[] = [];
  codigoBoda: string = '';
  finca: any = null;

  canvasWidth = 1200;
  canvasHeight = 800;

  modoEdicion = true;
  mesaSeleccionada: Mesa | null = null;

  constructor(
    private planoService: PlanoService,
    private notifService: NotificationService,
    private router: Router,
  ) {}

  private guardarPosicionSubject = new Subject<FabricMesaGroup>();

  ngOnInit() {
    this.codigoBoda = localStorage.getItem('codigoBoda') || '';
    if (!this.codigoBoda) {
      this.notifService.showError('Error', 'No se encontró código de boda');
      this.router.navigate(['/home']);
    }

    // Configurar debounce para guardar posiciones (espera 500ms después del último movimiento)
    this.guardarPosicionSubject
      .pipe(debounceTime(500))
      .subscribe((objeto) => {
        this.guardarPosicionMesaEnBackend(objeto);
      });
  }

  ngAfterViewInit() {
    this.inicializarCanvas();
    
    // Usar Promise para asegurar que el canvas está completamente inicializado
    Promise.resolve().then(() => this.cargarPlano());
  }

  ngOnDestroy() {
    if (this.canvas) {
      this.canvas.dispose();
    }
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

    // Evento cuando el usuario termina de mover una mesa
    this.canvas.on('object:modified', (options) => {
      const group = options.target as unknown as FabricMesaGroup;
      if (group?.data?.mesaId) {
        this.guardarPosicionMesa(group);
      }
    });

    // Restricción de movimiento para mantener objetos dentro del canvas
    this.canvas.on('object:moving', (e) => {
      const obj = e.target!;
      const canvasW = this.canvas.width!;
      const canvasH = this.canvas.height!;
      
      // Calcular límites considerando que el origen es 'center'
      const objHalfWidth = obj.getScaledWidth() / 2;
      const objHalfHeight = obj.getScaledHeight() / 2;

      const minLeft = objHalfWidth;
      const minTop = objHalfHeight;
      const maxLeft = canvasW - objHalfWidth;
      const maxTop = canvasH - objHalfHeight;

      // Aplicar restricciones
      if (obj.left! < minLeft) obj.left = minLeft;
      if (obj.top! < minTop) obj.top = minTop;
      if (obj.left! > maxLeft) obj.left = maxLeft;
      if (obj.top! > maxTop) obj.top = maxTop;
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

    const pattern = new Pattern({
      source: patternCanvas as any,
      repeat: 'repeat',
    });

    this.canvas.set({
      backgroundColor: pattern,
    });

    this.canvas.renderAll();
  }

  cargarPlano() {
    this.planoService.getPlano(this.codigoBoda).subscribe({
      next: (data) => {
        this.finca = data.finca;
        this.mesas = data.mesas;
        this.renderizarMesas();
      },
      error: (err) => {
        console.error('Error al cargar plano:', err);
        this.notifService.showError('Error', 'No se pudo cargar el plano');
        // Intentar recuperación mostrando canvas vacío
        this.mesas = [];
        this.renderizarMesas();
      },
    });
  }

  renderizarMesas() {
    // Limpiar canvas (mantener grid)
    const objetos = this.canvas.getObjects();
    objetos.forEach((obj: any) => {
      if (obj.selectable !== false) {
        this.canvas.remove(obj);
      }
    });

    // Renderizar cada mesa
    this.mesas.forEach((mesa) => {
      this.dibujarMesa(mesa);
    });

    this.canvas.renderAll();
  }

  dibujarMesa(mesa: Mesa) {
    console.log('═══════════════════════════════════');
    console.log('🎨 CARGANDO mesa:', mesa.nombre);
    console.log('   Posición desde BD:', mesa.posicion);
    
    // Validar y sanitizar coordenadas (rango 0-100)
    const posX = Math.max(0, Math.min(100, mesa.posicion?.x ?? 50));
    const posY = Math.max(0, Math.min(100, mesa.posicion?.y ?? 50));

    console.log('   Posición validada (%):', posX.toFixed(2), posY.toFixed(2));

    // Convertir porcentajes a píxeles
    const xPx = (posX / 100) * this.canvasWidth;
    const yPx = (posY / 100) * this.canvasHeight;

    console.log('   Posición en canvas (px):', xPx.toFixed(0), yPx.toFixed(0));
    console.log('═══════════════════════════════════');

    // ⚠️ CAMBIO CRÍTICO: Crear grupo SIN posición inicial
    const grupoMesa = new Group([], {
      selectable: true,
      originX: 'center',
      originY: 'center',
    } as any);

    // Círculo de la mesa
    const circuloMesa = new Circle({
      radius: mesa.radio || 60,
      fill: mesa.tipo === 'novios' ? '#d4af37' : '#ffffff',
      stroke: '#333',
      strokeWidth: 3,
      originX: 'center',
      originY: 'center',
    });

    grupoMesa.add(circuloMesa);

    // Nombre de la mesa
    const textoNombre = new Text(mesa.nombre, {
      fontSize: 16,
      fontFamily: 'Playfair Display',
      fill: mesa.tipo === 'novios' ? '#ffffff' : '#333',
      originX: 'center',
      originY: 'center',
    });

    grupoMesa.add(textoNombre);

    // Dibujar asientos alrededor
    mesa.asientos?.forEach((asiento, index) => {
      this.dibujarAsiento(
        grupoMesa,
        asiento,
        index,
        mesa.asientos.length,
        mesa.radio || 60,
      );
    });

    // ✅ ESTABLECER POSICIÓN DESPUÉS de agregar todos los elementos
    grupoMesa.set({
      left: xPx,
      top: yPx,
    });

    // Guardar referencia usando set() para que persista
    grupoMesa.set('data', {
      tipo: 'mesa',
      mesaId: mesa._id,
      mesa: mesa,
    });

    // Agregar al canvas
    this.canvas.add(grupoMesa);
    
    // ⚠️ CRÍTICO: Recalcular coordenadas del grupo después de agregarlo
    grupoMesa.setCoords();
    
    this.canvas.renderAll();

    console.log('   ✅ Mesa renderizada en:', grupoMesa.left, grupoMesa.top);
}

  dibujarAsiento(
    grupoMesa: Group,
    asiento: Asiento,
    index: number,
    totalAsientos: number,
    radioMesa: number,
  ) {
    // Distribuir asientos equitativamente en círculo
    const angulo = (360 / totalAsientos) * index;
    const radianes = (angulo * Math.PI) / 180;

    const distancia = radioMesa + 30; // Separación de 30px
    const x = Math.cos(radianes) * distancia;
    const y = Math.sin(radianes) * distancia;

    if (asiento.ocupado && asiento.invitado) {
      // Asiento ocupado
      const circuloAsiento = new Circle({
        radius: 20,
        fill: this.getColorPorTipo(asiento.invitado.tipo),
        stroke: asiento.invitado.confirmado ? '#27ae60' : '#e74c3c',
        strokeWidth: 3,
        left: x,
        top: y,
        originX: 'center',
        originY: 'center',
        selectable: false,
      });

      // Iniciales del invitado
      const iniciales = this.obtenerIniciales(asiento.invitado.nombre);
      const textoIniciales = new Text(iniciales, {
        fontSize: 12,
        fontWeight: 'bold',
        fill: '#fff',
        left: x,
        top: y,
        originX: 'center',
        originY: 'center',
        selectable: false,
      });

      // Guardar referencia del invitado
      (circuloAsiento as any).data = {
        tipo: 'asiento',
        invitado: asiento.invitado,
      };

      grupoMesa.add(circuloAsiento);
      grupoMesa.add(textoIniciales);

      // Icono de alergia si aplica
      if (asiento.invitado.alergias) {
        const iconoAlergia = new Text('⚠️', {
          fontSize: 14,
          left: x + 15,
          top: y - 15,
          originX: 'center',
          originY: 'center',
          selectable: false,
        });
        grupoMesa.add(iconoAlergia);
      }
    } else {
      // Asiento vacío
      const circuloVacio = new Circle({
        radius: 15,
        fill: 'transparent',
        stroke: '#bbb',
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        left: x,
        top: y,
        originX: 'center',
        originY: 'center',
        selectable: false,
      });

      grupoMesa.add(circuloVacio);
    }
  }

  guardarPosicionMesa(objeto: FabricMesaGroup) {
    console.log('═══════════════════════════════════');
    console.log('📍 ANTES de guardar:');
    console.log('   Canvas size:', this.canvasWidth, 'x', this.canvasHeight);
    
    const gridSize = 25;

    const ajustadoLeft = Math.round(objeto.left! / gridSize) * gridSize;
    const ajustadoTop = Math.round(objeto.top! / gridSize) * gridSize;

    console.log('   Posición en píxeles:', ajustadoLeft, ajustadoTop);
    
    const xPorcentaje = Math.max(5, Math.min(95, (ajustadoLeft / this.canvasWidth) * 100));
    const yPorcentaje = Math.max(5, Math.min(95, (ajustadoTop / this.canvasHeight) * 100));
    
    console.log('   Posición en %:', xPorcentaje.toFixed(2), yPorcentaje.toFixed(2));
    console.log('═══════════════════════════════════');

    objeto.set({
      left: ajustadoLeft,
      top: ajustadoTop,
    });

    objeto.setCoords();
    this.canvas.renderAll();
    this.guardarPosicionSubject.next(objeto);

    const mesaId = objeto.data?.mesaId;
    
    if (!mesaId) {
      console.error('❌ No se encontró ID de mesa en el objeto');
      this.notifService.showError('Error', 'No se pudo identificar la mesa');
      return;
    }

    this.planoService
      .actualizarPosicionMesa(mesaId, xPorcentaje, yPorcentaje, this.codigoBoda)
      .subscribe({
        next: (response) => {
          console.log('✅ RESPUESTA del servidor:', response);
          // 🔍 Verifica qué coordenadas devuelve el servidor
        },
        error: (err) => {
          console.error('❌ Error al guardar posición:', err);
          this.notifService.showError(
            'Error',
            'No se pudo guardar la posición en el servidor',
          );
          this.cargarPlano();
        },
      });
  }

  guardarPosicionMesaEnBackend(objeto: FabricMesaGroup) {
    const mesaId = objeto.data?.mesaId;
    
    if (!mesaId) {
      console.error('❌ No se encontró ID de mesa en el objeto');
      this.notifService.showError('Error', 'No se pudo identificar la mesa');
      return;
    }

    const gridSize = 25;
    const ajustadoLeft = Math.round(objeto.left! / gridSize) * gridSize;
    const ajustadoTop = Math.round(objeto.top! / gridSize) * gridSize;

    const xPorcentaje = Math.max(5, Math.min(95, (ajustadoLeft / this.canvasWidth) * 100));
    const yPorcentaje = Math.max(5, Math.min(95, (ajustadoTop / this.canvasHeight) * 100));

    console.log('🔄 GUARDANDO EN BACKEND:', { x: xPorcentaje, y: yPorcentaje });

    this.planoService
      .actualizarPosicionMesa(mesaId, xPorcentaje, yPorcentaje, this.codigoBoda)
      .subscribe({
        next: (response) => {
          console.log('✅ RESPUESTA del servidor:', response);
        },
        error: (err) => {
          console.error('❌ Error al guardar posición:', err);
          this.notifService.showError(
            'Error',
            'No se pudo guardar la posición en el servidor',
          );
          this.cargarPlano();
        },
      });
  }

  seleccionarMesa(mesaId: string) {
    this.mesaSeleccionada = this.mesas.find((m) => m._id === mesaId) || null;
  }

  mostrarInfoInvitado(invitado: any) {
    this.notifService.showSuccess(
      invitado.nombre,
      `Tipo: ${invitado.tipo} | Alergias: ${invitado.alergias || 'Ninguna'}`,
    );
  }

  agregarMesa() {
    const nuevaMesa = {
      codigoBoda: this.codigoBoda,
      nombre: `Mesa ${this.mesas.length + 1}`,
      tipo: 'invitados',
      capacidad: 8,
      posicion: { x: 50, y: 50 }, // Centro del canvas
    };

    this.planoService.agregarMesa(nuevaMesa).subscribe({
      next: () => {
        this.notifService.showSuccess('¡Éxito!', 'Mesa añadida en el centro');
        this.cargarPlano(); // Refrescar canvas
      },
      error: (err) => {
        console.error('Error al agregar mesa:', err);
        this.notifService.showError('Error', 'No se pudo crear la mesa');
      },
    });
  }

  obtenerIniciales(nombre: string): string {
    return nombre
      .split(' ')
      .map((n) => n.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }

  getColorPorTipo(tipo: string): string {
    const colores: any = {
      Familia: '#e67e22',
      Amigos: '#3498db',
      Trabajo: '#9b59b6',
    };
    return colores[tipo] || '#95a5a6';
  }

  toggleModoEdicion() {
    this.modoEdicion = !this.modoEdicion;
    this.canvas.selection = this.modoEdicion;

    // Actualizar propiedades de todas las mesas
    this.canvas.forEachObject((obj: any) => {
      if (obj.data && obj.data.tipo === 'mesa') {
        obj.selectable = this.modoEdicion;
        obj.hasControls = this.modoEdicion;
        obj.hasBorders = this.modoEdicion;
      }
    });

    this.canvas.renderAll();
  }

  irAlMenu() {
    this.router.navigate(['/home']);
  }
}