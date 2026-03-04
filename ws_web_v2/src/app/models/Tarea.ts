// src/app/models/Tarea.ts
// Modelo actualizado para Weddly API v2
//
// CAMBIOS vs v1:
//  • _id          → id (UUID)
//  • titulo       → title
//  • descripcion  → description
//  • fase         → phase  (valores en inglés: '6_months', etc.)
//  • categoria    → category
//  • estado       → status (valores en inglés: 'pending', etc.)
//  • asignadoA    → assigned_user_id
//  • fechaLimite  → due_date (ISO string)
//  • fechaCompletada → completed_at (ISO string, nullable)
//  • FaseChecklist, FASES_BODA, CATEGORIAS_TAREA → se mantienen como tipos de UI

// ─────────────────────────────────────────────
// TIPOS DEL BACKEND v2
// ─────────────────────────────────────────────

/** Fases del checklist — valores que devuelve y acepta la API v2 */
export type TareaFase =
  | '12_months'
  | '9_months'
  | '6_months'
  | '3_months'
  | '1_month'
  | '1_week';

/** Estados de una tarea — valores que devuelve y acepta la API v2 */
export type TareaStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

/** Entidad Tarea tal como la devuelve la API v2 */
export interface Tarea {
  id:                string;        // UUID — antes: _id
  wedding_id:        string;        // UUID de la boda — antes: codigoBoda
  template_id?:      string | null;
  title:             string;        // antes: titulo
  description?:      string | null; // antes: descripcion
  phase?:            TareaFase | null; // antes: fase
  category?:         string | null; // antes: categoria
  status:            TareaStatus;   // antes: estado
  assigned_user_id?: string | null; // antes: asignadoA
  due_date?:         string | null; // ISO string — antes: fechaLimite
  completed_at?:     string | null; // ISO string — antes: fechaCompletada (la rellena el backend)
  created_at:        string;
  updated_at:        string;
}

/** Respuesta del GET /api/weddings/:weddingId/tasks */
export interface TareasResponse {
  tasks:   Tarea[];
  grouped: Record<TareaFase, Tarea[]>;
  totals: {
    total:       number;
    completed:   number;
    pending:     number;
    in_progress: number;
  };
}

/** Respuesta del POST /api/weddings/:weddingId/tasks/initialize */
export interface InitializeResponse {
  created:        number;
  skipped_phases: TareaFase[];
}

// ─────────────────────────────────────────────
// TIPOS DE UI (frontend only — no van al backend)
// ─────────────────────────────────────────────

/** Objeto de fase para renderizar en el componente checklist */
export interface FaseChecklist {
  fase:       string;
  titulo:     string;
  descripcion: string;
  icon:       string;
  color:      string;
  tareas:     Tarea[];  // v2: lista de Tarea[]
  progreso:   number;
}

/** Mapa de fases con metadata de UI */
export const FASES_BODA: Record<TareaFase, { titulo: string; descripcion: string; icon: string; color: string }> = {
  '12_months': {
    titulo:      '12 meses antes',
    descripcion: 'Planificación inicial y reservas importantes',
    icon:        '📅',
    color:       '#8B5CF6',
  },
  '9_months': {
    titulo:      '9 meses antes',
    descripcion: 'Proveedores clave y detalles de la ceremonia',
    icon:        '💍',
    color:       '#EC4899',
  },
  '6_months': {
    titulo:      '6 meses antes',
    descripcion: 'Confirmaciones y preparativos intermedios',
    icon:        '🌸',
    color:       '#F59E0B',
  },
  '3_months': {
    titulo:      '3 meses antes',
    descripcion: 'Detalles finales y confirmaciones',
    icon:        '✉️',
    color:       '#10B981',
  },
  '1_month': {
    titulo:      '1 mes antes',
    descripcion: 'Últimos preparativos',
    icon:        '🎊',
    color:       '#3B82F6',
  },
  '1_week': {
    titulo:      '1 semana antes',
    descripcion: 'Coordinación final del gran día',
    icon:        '🎂',
    color:       '#EF4444',
  },
};

/** Categorías disponibles para las tareas */
export const CATEGORIAS_TAREA: string[] = [
  'venue',
  'catering',
  'fotografia',
  'musica',
  'decoracion',
  'vestimenta',
  'invitados',
  'transporte',
  'legal',
  'otro',
];