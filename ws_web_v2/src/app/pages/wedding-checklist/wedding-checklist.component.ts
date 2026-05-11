import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export type PlanType = 'free' | 'pro';

export interface FeatureItem {
  icon: string;
  title: string;
  description: string;
  isPro?: boolean;
}

export interface HowStep {
  numero: string;
  icon: string;
  titulo: string;
  descripcion: string;
}

@Component({
  selector: 'app-landing-features',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './wedding-checklist.component.html',
  styleUrl: './wedding-checklist.component.css'
})
export class WeddingChecklistComponent implements OnInit {

  planActivo: PlanType = 'pro';

  readonly diasSemana: string[] = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  readonly checklistFeatures: FeatureItem[] = [
    {
      icon: '⊞',
      title: 'Plantillas listas para usar',
      description: 'Carga más de 80 tareas esenciales de boda con un solo clic. Personalizables al 100%.',
    },
    {
      icon: '◎',
      title: 'Estados: Pendiente, En curso, Completada',
      description: 'Cambia el estado de cada tarea con un clic. Ve de un vistazo qué falta por hacer.',
    },
    {
      icon: '✨',
      title: 'Sugerencias con Inteligencia Artificial',
      description: 'La IA analiza tu perfil de boda y sugiere tareas personalizadas que quizás no habías contemplado.',
    },
    {
      icon: '⟳',
      title: 'Asigna responsables',
      description: 'Delega tareas a tu pareja, wedding planner o familia. Todos saben qué les toca.',
    },
  ];

  // ── Features del módulo Calendario ──────────────────────────
  readonly calendarioFeatures: FeatureItem[] = [
    {
      icon: '📅',
      title: 'Exportar a Google Calendar',
      description: 'Genera un archivo .ics con todas tus tareas y cárgalo en Google Calendar, Apple Calendar o Outlook en segundos.',
    },
    {
      icon: '📄',
      title: 'PDF para reuniones',
      description: 'Exporta un PDF profesional con tu cronograma completo. Imprescindible para reuniones con floristas, caterers y DJ.',
      isPro: true,
    },
    {
      icon: '💍',
      title: 'Acceso rápido al Día B',
      description: 'Botón especial para saltar directamente al mes de tu boda. Ver todos los hitos del gran día de un vistazo.',
    },
    {
      icon: '⊕',
      title: 'Asigna fechas desde el calendario',
      description: 'Haz clic en cualquier día y asigna tareas directamente desde el calendario sin salir de la vista.',
    },
  ];

  // ── Pasos del "Cómo funciona" ─────────────────────────────
  readonly pasos: HowStep[] = [
    {
      numero: '01',
      icon: '⊞',
      titulo: 'Carga tu plantilla',
      descripcion: 'Inicializa tu checklist con más de 80 tareas esenciales organizadas por fases temporales. Personaliza lo que necesites.',
    },
    {
      numero: '02',
      icon: '◎',
      titulo: 'Gestiona y delega',
      descripcion: 'Cambia estados, asigna responsables y deja que la IA te sugiera tareas que quizás habías pasado por alto.',
    },
    {
      numero: '03',
      icon: '↗',
      titulo: 'Exporta y comparte',
      descripcion: 'Sincroniza con Google Calendar para recordatorios automáticos. Exporta PDF para reuniones con proveedores.',
    },
  ];

  // ── Features del plan Free ───────────────────────────────────
  readonly freeFeatures = [
    { texto: 'Checklist hasta 20 tareas',          incluido: true },
    { texto: 'Plantilla básica de boda',            incluido: true },
    { texto: '3 fases temporales',                  incluido: true },
    { texto: 'Calendario visual',                   incluido: true },
    { texto: 'Exportar a Google Calendar (.ics)',   incluido: true },
    { texto: '2 sugerencias de IA al mes',          incluido: true },
    { texto: 'Exportar PDF',                        incluido: false },
    { texto: 'Checklist ilimitado',                 incluido: false },
    { texto: 'Sugerencias IA ilimitadas',           incluido: false },
    { texto: 'Colaboradores',                       incluido: false },
  ];

  // ── Features del plan Pro ────────────────────────────────────
  readonly proFeatures = [
    { texto: 'Checklist ilimitado',                 incluido: true },
    { texto: 'Plantilla completa (80+ tareas)',     incluido: true },
    { texto: '6 fases temporales',                  incluido: true },
    { texto: 'Calendario visual avanzado',          incluido: true },
    { texto: 'Exportar a Google Calendar (.ics)',   incluido: true },
    { texto: 'Exportar PDF profesional',            incluido: true },
    { texto: 'Sugerencias IA ilimitadas',           incluido: true },
    { texto: 'Hasta 5 colaboradores',               incluido: true },
    { texto: 'Acceso de por vida',                  incluido: true },
    { texto: 'Soporte prioritario',                 incluido: true },
  ];

  // ────────────────────────────────────────────────────────────
  // Lifecycle
  // ────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Posicionar el scroll al inicio al entrar en la página
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ────────────────────────────────────────────────────────────
  // Métodos públicos
  // ────────────────────────────────────────────────────────────

  /**
   * Cambia el plan activo en el toggle de precios.
   * Controla qué card de precio se muestra destacada.
   *
   * @param plan - 'free' | 'pro'
   */
  cambiarPlan(plan: PlanType): void {
    this.planActivo = plan;
  }

  /**
   * Hace scroll suave hasta una sección por su ID de ancla.
   *
   * @param sectionId - ID del elemento HTML al que hacer scroll
   */
  scrollTo(sectionId: string): void {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}