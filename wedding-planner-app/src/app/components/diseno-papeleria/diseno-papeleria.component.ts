import { Component, OnInit, ElementRef, ViewChild, ChangeDetectorRef} from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import localeEs from '@angular/common/locales/es';
import { NotificationService } from '../../services/notification/notification.service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

registerLocaleData(localeEs);

interface Invitado {
  _id: string;
  nombre: string;
  email: string;
  tipo?: string;
  menu?: string;
  mesa?: string;
}

@Component({
  selector: 'app-diseno-papeleria',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './diseno-papeleria.component.html',
  styleUrl: './diseno-papeleria.component.css',
})
export class DisenoPapeleriaComponent implements OnInit {
  @ViewChild('invitacionCard', { static: false }) invitacionCard!: ElementRef;

  // --- Datos de la Invitación ---
  nombreNovia: string = 'Valery';
  nombreNovio: string = 'Javier';
  fecha: string = '2025-09-20';
  colorFondo: string = '#ffffff';
  colorTexto: string = '#d4a373';
  textoExtra: string = '¡Tu presencia es nuestro mejor regalo!';
  imagenFondo: string | null = null;
  plantillaActiva: string = 'clasica';

  // --- Estado de la Interfaz ---
  mostrarConfirmacionSalida: boolean = false;
  cambiosRealizados: boolean = false;
  generandoPDF: boolean = false;
  enviandoEmail: boolean = false;
  
  // Modal de selector de invitados
  mostrarSelectorInvitados: boolean = false;
  invitadosConEmail: Invitado[] = [];
  
  private API_URL = 'http://localhost:3000/api/gestion';

  constructor(
    private http: HttpClient,
    private router: Router,
    private notifService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarConfiguracion();
  }

  registrarCambio() {
    this.cambiosRealizados = true;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagenFondo = e.target.result;
        this.registrarCambio();
      };
      reader.readAsDataURL(file);
    }
  }

  cambiarPlantilla(tipo: string) {
    if (this.plantillaActiva !== tipo) {
      this.plantillaActiva = tipo;
      this.registrarCambio();
    }
  }

  async generarPDF() {
    if (!this.invitacionCard) {
      this.notifService.showError('Error', 'No se pudo encontrar la invitación');
      return;
    }

    this.generandoPDF = true;
    this.notifService.showSuccess('Generando PDF', 'Por favor espera...');

    try {
      const elemento = this.invitacionCard.nativeElement;
      const canvas = await html2canvas(elemento, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 150;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const x = (pdf.internal.pageSize.getWidth() - imgWidth) / 2;
      const y = (pdf.internal.pageSize.getHeight() - imgHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      const nombreArchivo = `Invitacion_${this.nombreNovia}_${this.nombreNovio}.pdf`;
      pdf.save(nombreArchivo);

      this.notifService.showSuccess(
        '¡PDF Generado!',
        'Tu invitación se ha descargado correctamente'
      );
    } catch (error) {
      console.error('Error al generar PDF:', error);
      this.notifService.showError('Error', 'Hubo un problema al generar el PDF');
    } finally {
      this.generandoPDF = false;
    }
  }

  irAlMenu() {
    if (this.cambiosRealizados) {
      this.notifService
        .askConfirmation(
          'Confirmar salida',
          'Tienes cambios sin guardar. ¿Estás seguro de que quieres salir sin guardar?',
          'salida_sin_guardar'
        )
        .then((confirmed) => {
          if (confirmed) {
            this.confirmarSalida();
          }
        });
    } else {
      this.confirmarSalida();
    }
  }

  confirmarSalida() {
    this.router.navigate(['/dashboard']);
  }

  // ✅ GUARDAR - Sin autenticación (ruta pública)
  guardarConfiguracion() {
    const datos = {
      codigoBoda: localStorage.getItem('codigoBoda'),
      nombreNovia: this.nombreNovia,
      nombreNovio: this.nombreNovio,
      fecha: this.fecha,
      colorFondo: this.colorFondo,
      colorTexto: this.colorTexto,
      textoExtra: this.textoExtra,
      plantilla: this.plantillaActiva,
      imagenFondo: this.imagenFondo,
    };

    this.http.post(`${this.API_URL}/configuracion-boda`, datos).subscribe({
      next: (res: any) => {
        this.cambiosRealizados = false;
        this.notifService.showSuccess(
          '¡Guardado!',
          'Configuración de papelería guardada correctamente.'
        );
      },
      error: (err) => {
        console.error('Error al guardar:', err);
        this.notifService.showError(
          'Error',
          'Hubo un problema al guardar la configuración.'
        );
      },
    });
  }

  // ✅ CARGAR - Sin autenticación (ruta pública)
  cargarConfiguracion() {
    const codigo = localStorage.getItem('codigoBoda');

    if (codigo) {
      // SIN HEADERS - La ruta es pública
      this.http
        .get<any>(`${this.API_URL}/configuracion-boda/${codigo}`)
        .subscribe({
          next: (res) => {
            console.log('📥 Configuración recibida:', res);
            if (res) {
              this.nombreNovia = res.nombreNovia || this.nombreNovia;
              this.nombreNovio = res.nombreNovio || this.nombreNovio;
              this.fecha = res.fecha || this.fecha;
              this.colorFondo = res.colorFondo || this.colorFondo;
              this.colorTexto = res.colorTexto || this.colorTexto;
              this.textoExtra = res.textoExtra || this.textoExtra;
              this.plantillaActiva = res.plantilla || this.plantillaActiva;
              this.imagenFondo = res.imagenFondo || this.imagenFondo;
            }
          },
          error: (err) => {
            console.error('❌ Error al cargar configuración:', err);
            if (err.status !== 404) {
              this.notifService.showError(
                'Error',
                'No se pudo cargar la configuración'
              );
            }
          },
        });
    }
  }

  // ✅ SELECTOR DE INVITADOS - Con autenticación (ruta protegida)
  async abrirSelectorInvitados() {
    const codigoBoda = localStorage.getItem('codigoBoda');
    const token = localStorage.getItem('token');
    
    if (!codigoBoda) {
      this.notifService.showError('Error', 'No se encontró el código de boda');
      return;
    }

    // Esta ruta SÍ necesita autenticación
    const headers = { Authorization: `Bearer ${token}` };

    this.http.get<Invitado[]>(
      `${this.API_URL}/invitados?codigoBoda=${codigoBoda}`,
      { headers }
    ).subscribe({
        next: (invitados) => {
          this.invitadosConEmail = invitados.filter(inv => inv.email && inv.email.includes('@'));
          
          if (this.invitadosConEmail.length === 0) {
            this.notifService.showError(
              'Sin invitados',
              'No hay invitados con email registrado'
            );
            return;
          }
          
          this.mostrarSelectorInvitados = true;
        },
        error: (err) => {
          console.error('Error al cargar invitados:', err);
          this.notifService.showError('Error', 'No se pudieron cargar los invitados');
        }
      });
  }

  cerrarSelectorInvitados() {
    this.mostrarSelectorInvitados = false;
    this.invitadosConEmail = [];
  }

  async seleccionarInvitado(invitado: Invitado) {
    this.cerrarSelectorInvitados();
    await this.enviarEmail(invitado.email, invitado.nombre);
  }

  async enviarEmail(emailDestino: string, nombreInvitado?: string) {
    if (!this.invitacionCard) {
      this.notifService.showError('Error', 'No se pudo encontrar la invitación');
      return;
    }

    this.enviandoEmail = true;
    this.notifService.showSuccess('Enviando...', 'Generando invitación');

    try {
      const elemento = this.invitacionCard.nativeElement;
      const canvas = await html2canvas(elemento, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 150;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const x = (pdf.internal.pageSize.getWidth() - imgWidth) / 2;
      const y = (pdf.internal.pageSize.getHeight() - imgHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      const pdfBase64 = pdf.output('datauristring');

      const payload = {
        email: emailDestino,
        nombre: nombreInvitado || 'Invitado',
        datosInvitacion: {
          nombreNovia: this.nombreNovia,
          nombreNovio: this.nombreNovio,
          fecha: this.fecha,
          textoExtra: this.textoExtra,
          colorTexto: this.colorTexto,
        },
        pdfBase64: pdfBase64,
      };

      this.http
        .post(`${this.API_URL}/enviar-invitacion-individual`, payload)
        .subscribe({
          next: (res: any) => {
            this.enviandoEmail = false;
            this.notifService.showSuccess(
              '¡Enviado!',
              `Invitación enviada a ${emailDestino}`
            );
          },
          error: (err) => {
            console.error('❌ Error al enviar:', err);
            this.enviandoEmail = false;
            this.notifService.showError(
              'Error',
              'Hubo un problema al enviar el email'
            );
          },
        });
    } catch (error) {
      console.error('❌ Error al generar PDF:', error);
      this.enviandoEmail = false;
      this.notifService.showError(
        'Error',
        'Hubo un problema al generar la invitación'
      );
    }
  }

  async enviarInvitacionesMasivas() {
    const confirmado = await this.notifService.askConfirmation(
      'Envío Masivo',
      '¿Estás seguro de enviar la invitación a TODOS los invitados con email?',
      'envio_masivo'
    );

    if (!confirmado) return;

    this.enviandoEmail = true;
    this.notifService.showSuccess('Procesando...', 'Generando invitación para envío masivo');

    try {
      const elemento = this.invitacionCard.nativeElement;
      const canvas = await html2canvas(elemento, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 150;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const x = (pdf.internal.pageSize.getWidth() - imgWidth) / 2;
      const y = (pdf.internal.pageSize.getHeight() - imgHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      const pdfBase64 = pdf.output('datauristring');

      const payload = {
        codigoBoda: localStorage.getItem('codigoBoda'),
        datosInvitacion: {
          nombreNovia: this.nombreNovia,
          nombreNovio: this.nombreNovio,
          fecha: this.fecha,
          textoExtra: this.textoExtra,
          colorTexto: this.colorTexto,
        },
        pdfBase64: pdfBase64,
      };

      this.http
        .post(`${this.API_URL}/enviar-invitaciones-masivas`, payload)
        .subscribe({
          next: (res: any) => {
            this.enviandoEmail = false;
            this.notifService.showSuccess(
              '¡Completado!',
              `Enviadas: ${res.exitosos} | Fallidas: ${res.fallidos}`
            );
          },
          error: (err) => {
            console.error('Error:', err);
            this.enviandoEmail = false;
            this.notifService.showError(
              'Error',
              'Hubo un problema en el envío masivo'
            );
          },
        });
    } catch (error) {
      console.error('Error:', error);
      this.enviandoEmail = false;
      this.notifService.showError(
        'Error',
        'Hubo un problema al generar la invitación'
      );
    }
  }
}