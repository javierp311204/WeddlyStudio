import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Canvas, Circle, Group, Text, Pattern } from 'fabric';
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
  imports: [CommonModule, FormsModule],
  templateUrl: './plano-interactivo.component.html',
  styleUrl: './plano-interactivo.component.css',
})
export class PlanoInteractivoComponent
  implements OnInit, AfterViewInit, OnDestroy
{
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

  // Para agregar invitados
  invitadosDisponibles: any[] = [];
  invitadosFiltrados: any[] = [];
  busquedaInvitado: string = '';
  invitadoSeleccionado: any = null;

  // Para el desplegable de invitados
  listaInvitadosAbierta: boolean = false;

  // Para el modal de información del invitado
  invitadoModalInfo: any = null;

  // ✅ Flag para prevenir cierre inmediato
  private modalJustOpened = false;

  private guardarPosicionSubject = new Subject<FabricMesaGroup>();

  constructor(
    private planoService: PlanoService,
    private notifService: NotificationService,
    private router: Router,
    private ngZone: NgZone,
  ) {}

  ngOnInit() {
    this.codigoBoda = localStorage.getItem('codigoBoda') || '';
    if (!this.codigoBoda) {
      this.notifService.showError('Error', 'No se encontró código de boda');
      this.router.navigate(['/home']);
    }

    this.guardarPosicionSubject.pipe(debounceTime(500)).subscribe((objeto) => {
      this.guardarPosicionMesaEnBackend(objeto);
    });
  }

  ngAfterViewInit() {
    this.inicializarCanvas();
    Promise.resolve().then(() => this.cargarPlano());

    // ✅ Prevenir propagación de eventos del canvas al documento
    if (this.canvasElement && this.canvasElement.nativeElement) {
      this.canvasElement.nativeElement.addEventListener(
        'mousedown',
        (e: MouseEvent) => {
          e.stopPropagation();
        },
        true,
      );
      
      // ✅ También prevenir en mouseup
      this.canvasElement.nativeElement.addEventListener(
        'mouseup',
        (e: MouseEvent) => {
          e.stopPropagation();
        },
        true,
      );
    }
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

    this.canvas.on('object:modified', (options) => {
      const group = options.target as unknown as FabricMesaGroup;
      if (group?.data?.mesaId) {
        this.guardarPosicionMesa(group);
      }
    });

    // ✅ FIX PRINCIPAL: Usar mouse:down en lugar de mouse:up
    this.canvas.on('mouse:down', (options) => {
      console.log('👆 Mouse DOWN en canvas detectado');

      // Buscar en subTargets primero
      if (options.subTargets && options.subTargets.length > 0) {
        const subTarget = options.subTargets[0] as any;
        console.log('📍 SubTarget encontrado:', subTarget.data?.tipo);

        if (subTarget?.data?.tipo === 'asiento' && subTarget.data.invitado) {
          console.log('🎯 Click en asiento detectado');

          // ✅ Prevenir propagación
          if (options.e) {
            options.e.stopPropagation();
            options.e.preventDefault();
          }

          // ✅ Activar flag y abrir modal
          this.modalJustOpened = true;
          
          this.ngZone.run(() => {
            this.mostrarModalInvitado(subTarget.data.invitado);
            
            // ✅ Desactivar flag después de un pequeño delay
            setTimeout(() => {
              this.modalJustOpened = false;
            }, 300);
          });
          
          return;
        }
      }

      // Target principal (mesa)
      const target = options.target as any;
      if (target?.data?.tipo === 'mesa') {
        console.log('🏠 Click en mesa detectado');
        this.seleccionarMesa(target.data.mesaId);
      }
    });

    this.canvas.on('object:moving', (e) => {
      const obj = e.target!;
      const canvasW = this.canvas.width!;
      const canvasH = this.canvas.height!;

      const objHalfWidth = obj.getScaledWidth() / 2;
      const objHalfHeight = obj.getScaledHeight() / 2;

      const minLeft = objHalfWidth;
      const minTop = objHalfHeight;
      const maxLeft = canvasW - objHalfWidth;
      const maxTop = canvasH - objHalfHeight;

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
        this.invitadosDisponibles = data.invitados || [];

        this.renderizarMesas();

        // Actualizar mesa seleccionada si existe
        if (this.mesaSeleccionada) {
          const mesaActualizada = this.mesas.find(
            (m) => m._id === this.mesaSeleccionada!._id,
          );
          if (mesaActualizada) {
            this.mesaSeleccionada = mesaActualizada;
          }
        }
      },
      error: (err) => {
        console.error('Error al cargar plano:', err);
        this.notifService.showError('Error', 'No se pudo cargar el plano');
        this.mesas = [];
        this.renderizarMesas();
      },
    });
  }

  renderizarMesas() {
    const objetos = this.canvas.getObjects();
    objetos.forEach((obj: any) => {
      if (obj.selectable !== false) {
        this.canvas.remove(obj);
      }
    });

    this.mesas.forEach((mesa) => {
      this.dibujarMesa(mesa);
    });

    this.canvas.renderAll();
  }

  dibujarMesa(mesa: Mesa) {
    const posX = Math.max(0, Math.min(100, mesa.posicion?.x ?? 50));
    const posY = Math.max(0, Math.min(100, mesa.posicion?.y ?? 50));

    const xPx = (posX / 100) * this.canvasWidth;
    const yPx = (posY / 100) * this.canvasHeight;

    const grupoMesa = new Group([], {
      selectable: true,
      originX: 'center',
      originY: 'center',
      // ✅ CRÍTICO: Permitir detectar clicks en objetos internos
      subTargetCheck: true,
      interactive: true,
    } as any);

    const circuloMesa = new Circle({
      radius: mesa.radio || 60,
      fill: mesa.tipo === 'novios' ? '#d4af37' : '#ffffff',
      stroke: '#333',
      strokeWidth: 3,
      originX: 'center',
      originY: 'center',
      evented: false,
    });

    grupoMesa.add(circuloMesa);

    const textoNombre = new Text(mesa.nombre, {
      fontSize: 16,
      fontFamily: 'Playfair Display',
      fill: mesa.tipo === 'novios' ? '#ffffff' : '#333',
      originX: 'center',
      originY: 'center',
      top: -5,
      evented: false,
    });

    grupoMesa.add(textoNombre);

    const ocupados = mesa.asientos?.filter((a) => a.ocupado)?.length || 0;
    const textoContador = new Text(`${ocupados}/${mesa.capacidad}`, {
      fontSize: 12,
      fontFamily: 'Arial',
      fill: '#666',
      originX: 'center',
      originY: 'center',
      top: 15,
      evented: false,
    });

    grupoMesa.add(textoContador);

    if (mesa.asientos && mesa.asientos.length > 0) {
      mesa.asientos.forEach((asiento, index) => {
        this.dibujarAsiento(
          grupoMesa,
          asiento,
          index,
          mesa.asientos.length,
          mesa.radio || 60,
        );
      });
    }

    grupoMesa.set({
      left: xPx,
      top: yPx,
    });

    grupoMesa.set('data', {
      tipo: 'mesa',
      mesaId: mesa._id,
      mesa: mesa,
    });

    this.canvas.add(grupoMesa);
    grupoMesa.setCoords();
    this.canvas.renderAll();
  }

  dibujarAsiento(
    grupoMesa: Group,
    asiento: Asiento,
    index: number,
    totalAsientos: number,
    radioMesa: number,
  ) {
    const angulo = (360 / totalAsientos) * index;
    const radianes = (angulo * Math.PI) / 180;

    const distancia = radioMesa + 35;
    const x = Math.cos(radianes) * distancia;
    const y = Math.sin(radianes) * distancia;

    if (asiento.ocupado && asiento.invitado) {
      const circuloAsiento = new Circle({
        radius: 22,
        fill: this.getColorPorTipo(asiento.invitado.tipo),
        stroke: asiento.invitado.confirmado ? '#27ae60' : '#e74c3c',
        strokeWidth: 3,
        left: x,
        top: y,
        originX: 'center',
        originY: 'center',
        selectable: false,
        hoverCursor: 'pointer',
        evented: true,
        subTargetCheck: true,
      });

      const iniciales = this.obtenerIniciales(asiento.invitado.nombre);
      const textoIniciales = new Text(iniciales, {
        fontSize: 13,
        fontWeight: 'bold',
        fill: '#fff',
        left: x,
        top: y,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      });

      (circuloAsiento as any).data = {
        tipo: 'asiento',
        invitado: asiento.invitado,
      };

      grupoMesa.add(circuloAsiento);
      grupoMesa.add(textoIniciales);

      if (asiento.invitado.alergias) {
        const iconoAlergia = new Text('⚠️', {
          fontSize: 16,
          left: x + 18,
          top: y - 18,
          originX: 'center',
          originY: 'center',
          selectable: false,
          evented: false,
        });
        grupoMesa.add(iconoAlergia);
      }

      if (asiento.invitado.confirmado) {
        const iconoCheck = new Text('✓', {
          fontSize: 14,
          fontWeight: 'bold',
          fill: '#27ae60',
          left: x - 18,
          top: y - 18,
          originX: 'center',
          originY: 'center',
          selectable: false,
          evented: false,
        });
        grupoMesa.add(iconoCheck);
      }
    } else {
      const circuloVacio = new Circle({
        radius: 18,
        fill: 'transparent',
        stroke: '#bbb',
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        left: x,
        top: y,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      });

      grupoMesa.add(circuloVacio);
    }
  }

  guardarPosicionMesa(objeto: FabricMesaGroup) {
    const gridSize = 25;
    const ajustadoLeft = Math.round(objeto.left! / gridSize) * gridSize;
    const ajustadoTop = Math.round(objeto.top! / gridSize) * gridSize;

    objeto.set({
      left: ajustadoLeft,
      top: ajustadoTop,
    });

    objeto.setCoords();
    this.canvas.renderAll();

    this.guardarPosicionSubject.next(objeto);
  }

  guardarPosicionMesaEnBackend(objeto: FabricMesaGroup) {
    const mesaId = objeto.data?.mesaId;

    if (!mesaId) {
      console.error('❌ No se encontró ID de mesa');
      this.notifService.showError('Error', 'No se pudo identificar la mesa');
      return;
    }

    const gridSize = 25;
    const ajustadoLeft = Math.round(objeto.left! / gridSize) * gridSize;
    const ajustadoTop = Math.round(objeto.top! / gridSize) * gridSize;

    const xPorcentaje = Math.max(
      5,
      Math.min(95, (ajustadoLeft / this.canvasWidth) * 100),
    );
    const yPorcentaje = Math.max(
      5,
      Math.min(95, (ajustadoTop / this.canvasHeight) * 100),
    );

    this.planoService
      .actualizarPosicionMesa(mesaId, xPorcentaje, yPorcentaje, this.codigoBoda)
      .subscribe({
        next: () => {
          console.log('✅ Posición guardada');
        },
        error: (err) => {
          console.error('❌ Error al guardar:', err);
          this.notifService.showError(
            'Error',
            'No se pudo guardar la posición',
          );
          this.cargarPlano();
        },
      });
  }

  seleccionarMesa(mesaId: string) {
    this.mesaSeleccionada = this.mesas.find((m) => m._id === mesaId) || null;
    this.listaInvitadosAbierta = false;
    this.limpiarBusqueda();

    if (this.mesaSeleccionada) {
      console.log('Mesa seleccionada:', this.mesaSeleccionada.nombre);
    }
  }

  toggleListaInvitados() {
    this.listaInvitadosAbierta = !this.listaInvitadosAbierta;
  }

  filtrarInvitados() {
    if (!this.busquedaInvitado || this.busquedaInvitado.trim() === '') {
      this.invitadosFiltrados = [];
      return;
    }

    const term = this.busquedaInvitado.toLowerCase().trim();

    this.invitadosFiltrados = this.invitadosDisponibles
      .filter((inv) => {
        const coincideNombre = inv.nombre.toLowerCase().includes(term);
        const sinMesa =
          !inv.mesa || inv.mesa === '' || inv.mesa === 'Sin Asignar';
        return coincideNombre && sinMesa;
      })
      .slice(0, 5);
  }

  seleccionarInvitado(inv: any) {
    this.invitadoSeleccionado = inv;
    this.busquedaInvitado = inv.nombre;
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

    this.planoService
      .asignarInvitadoAMesa(
        this.mesaSeleccionada._id,
        this.invitadoSeleccionado._id,
        this.codigoBoda,
      )
      .subscribe({
        next: () => {
          this.notifService.showSuccess(
            '¡Éxito!',
            'Invitado asignado a la mesa',
          );
          this.limpiarBusqueda();
          this.cargarPlano();
        },
        error: (err) => {
          console.error('Error:', err);
          this.notifService.showError(
            'Error',
            err.error?.error || 'No se pudo asignar',
          );
        },
      });
  }

  quitarInvitadoDeMesa(invitadoId: string) {
    if (!this.mesaSeleccionada) return;

    this.notifService
      .askConfirmation(
        'Quitar invitado',
        '¿Deseas quitar este invitado de la mesa?',
        'warning',
      )
      .then((confirm) => {
        if (confirm) {
          this.planoService
            .quitarInvitadoDeMesa(
              this.mesaSeleccionada!._id,
              invitadoId,
              this.codigoBoda,
            )
            .subscribe({
              next: () => {
                this.notifService.showSuccess(
                  '¡Listo!',
                  'Invitado quitado de la mesa',
                );
                this.cargarPlano();
              },
              error: (err) => {
                console.error('Error:', err);
                this.notifService.showError(
                  'Error',
                  'No se pudo quitar el invitado',
                );
              },
            });
        }
      });
  }

  eliminarMesa() {
    if (!this.mesaSeleccionada) return;

    const ocupados = this.contarAsientosOcupados(this.mesaSeleccionada);

    if (ocupados > 0) {
      this.notifService.showError(
        'Mesa ocupada',
        `Hay ${ocupados} invitado(s) sentados. Quítalos primero.`,
      );
      return;
    }

    this.notifService
      .askConfirmation(
        'Eliminar mesa',
        `¿Estás seguro de eliminar "${this.mesaSeleccionada.nombre}"?`,
        'delete',
      )
      .then((confirm) => {
        if (confirm) {
          this.planoService
            .eliminarMesa(this.mesaSeleccionada!._id, this.codigoBoda)
            .subscribe({
              next: () => {
                this.notifService.showSuccess(
                  '¡Eliminada!',
                  'Mesa eliminada correctamente',
                );
                this.mesaSeleccionada = null;
                this.cargarPlano();
              },
              error: (err) => {
                console.error('Error:', err);
                this.notifService.showError(
                  'Error',
                  'No se pudo eliminar la mesa',
                );
              },
            });
        }
      });
  }

  mostrarModalInvitado(invitado: any) {
    console.log('🔵 Abriendo modal para:', invitado.nombre);
    this.invitadoModalInfo = invitado;
  }

  cerrarModalInvitado() {
    // ✅ Verificar flag antes de cerrar
    if (this.modalJustOpened) {
      console.log('⏸️ Modal recién abierto, no cerrar');
      return;
    }
    console.log('🔴 Cerrando modal');
    this.invitadoModalInfo = null;
  }

  cerrarModalForzado() {
    console.log('❌ Cierre forzado del modal');
    this.modalJustOpened = false;
    this.invitadoModalInfo = null;
  }

  mostrarInfoInvitado(invitado: any) {
    const estado = invitado.confirmado ? '✅ Confirmado' : '❌ Pendiente';
    const alergias = invitado.alergias
      ? `⚠️ ${invitado.alergias}`
      : '✓ Sin alergias';

    this.notifService.showSuccess(
      `${invitado.nombre}`,
      `${invitado.tipo} | ${estado} | ${alergias}`,
    );
  }

  agregarMesa() {
    const nuevaMesa = {
      codigoBoda: this.codigoBoda,
      nombre: `Mesa ${this.mesas.length + 1}`,
      tipo: 'invitados',
      capacidad: 8,
      posicion: { x: 50, y: 50 },
    };

    this.planoService.agregarMesa(nuevaMesa).subscribe({
      next: () => {
        this.notifService.showSuccess('¡Éxito!', 'Mesa añadida en el centro');
        this.cargarPlano();
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
      Pareja: '#e91e63',
    };
    return colores[tipo] || '#95a5a6';
  }

  contarAsientosOcupados(mesa: Mesa): number {
    if (!mesa.asientos) return 0;
    return mesa.asientos.filter((asiento) => asiento.ocupado === true).length;
  }

  obtenerIdInvitado(asiento: Asiento): string {
    if (asiento.invitado?._id) {
      return asiento.invitado._id;
    }
    if (asiento.invitado_id) {
      return asiento.invitado_id;
    }
    return '';
  }

  toggleModoEdicion() {
    this.modoEdicion = !this.modoEdicion;
    this.canvas.selection = this.modoEdicion;

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