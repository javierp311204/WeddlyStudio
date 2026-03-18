export type TareaFase =
  | '12_months'
  | '9_months'
  | '6_months'
  | '3_months'
  | '1_month'
  | '1_week';

export type TareaStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
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
export interface InitializeResponse {
  created:        number;
  skipped_phases: TareaFase[];
}
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
    titulo:      'TASKS.WEDDING_PHASES.12_MONTHS_TITLE',
    descripcion: 'TASKS.WEDDING_PHASES.12_MONTHS_DESC',
    icon:        '📅',
    color:       '#8B5CF6',
  },
  '9_months': {
    titulo:      'TASKS.WEDDING_PHASES.9_MONTHS_TITLE',
    descripcion: 'TASKS.WEDDING_PHASES.9_MONTHS_DESC',
    icon:        '💍',
    color:       '#EC4899',
  },
  '6_months': {
    titulo:      'TASKS.WEDDING_PHASES.6_MONTHS_TITLE',
    descripcion: 'TASKS.WEDDING_PHASES.6_MONTHS_DESC',
    icon:        '🌸',
    color:       '#F59E0B',
  },
  '3_months': {
    titulo:      'TASKS.WEDDING_PHASES.3_MONTHS_TITLE',
    descripcion: 'TASKS.WEDDING_PHASES.3_MONTHS_DESC',
    icon:        '✉️',
    color:       '#10B981',
  },
  '1_month': {
    titulo:      'TASKS.WEDDING_PHASES.1_MONTH_TITLE',
    descripcion: 'TASKS.WEDDING_PHASES.1_MONTH_DESC',
    icon:        '🎊',
    color:       '#3B82F6',
  },
  '1_week': {
    titulo:      'TASKS.WEDDING_PHASES.1_WEEK_TITLE',
    descripcion: 'TASKS.WEDDING_PHASES.1_WEEK_DESC',
    icon:        '🎂',
    color:       '#EF4444',
  },
};


/** Categorías disponibles para las tareas */
export const CATEGORIAS_TAREA: string[] = [
  'CHECKLIST.CATEGORIES.VENUE',
  'CHECKLIST.CATEGORIES.CATERING',
  'CHECKLIST.CATEGORIES.PHOTOGRAPHY',
  'CHECKLIST.CATEGORIES.MUSIC',
  'CHECKLIST.CATEGORIES.DECORATION',
  'CHECKLIST.CATEGORIES.DRESS',
  'CHECKLIST.CATEGORIES.INVITATIONS',
  'CHECKLIST.CATEGORIES.TRANSPORT',
  'CHECKLIST.CATEGORIES.LEGAL',
  'CHECKLIST.CATEGORIES.OTHER',
];