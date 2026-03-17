// ============================================================
// WEDDLY — Plantillas de tareas predefinidas por fase
// Los campos title y description son claves i18n.
// El frontend usa {{ task.title | translate }} para mostrarlas.
// ============================================================

export interface TaskTemplate {
  title: string;
  description?: string;
  phase: string;
  category: string;
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  // ─── 12 MESES ──────────────────────────────────────────────────
  {
    phase: '12_months',
    category: 'budget',
    title: 'TASKS.12_MONTHS.DEFINE_BUDGET.TITLE',
    description: 'TASKS.12_MONTHS.DEFINE_BUDGET.DESC',
  },
  {
    phase: '12_months',
    category: 'venue',
    title: 'TASKS.12_MONTHS.CEREMONY_VENUE.TITLE',
    description: 'TASKS.12_MONTHS.CEREMONY_VENUE.DESC',
  },
  {
    phase: '12_months',
    category: 'venue',
    title: 'TASKS.12_MONTHS.BANQUET_VENUE.TITLE',
    description: 'TASKS.12_MONTHS.BANQUET_VENUE.DESC',
  },
  {
    phase: '12_months',
    category: 'guests',
    title: 'TASKS.12_MONTHS.GUEST_LIST.TITLE',
    description: 'TASKS.12_MONTHS.GUEST_LIST.DESC',
  },
  {
    phase: '12_months',
    category: 'legal',
    title: 'TASKS.12_MONTHS.LEGAL.TITLE',
    description: 'TASKS.12_MONTHS.LEGAL.DESC',
  },

  // ─── 9 MESES ───────────────────────────────────────────────────
  {
    phase: '9_months',
    category: 'photography',
    title: 'TASKS.9_MONTHS.PHOTOGRAPHER.TITLE',
    description: 'TASKS.9_MONTHS.PHOTOGRAPHER.DESC',
  },
  {
    phase: '9_months',
    category: 'photography',
    title: 'TASKS.9_MONTHS.VIDEOGRAPHER.TITLE',
    description: 'TASKS.9_MONTHS.VIDEOGRAPHER.DESC',
  },
  {
    phase: '9_months',
    category: 'music',
    title: 'TASKS.9_MONTHS.MUSIC.TITLE',
    description: 'TASKS.9_MONTHS.MUSIC.DESC',
  },
  {
    phase: '9_months',
    category: 'catering',
    title: 'TASKS.9_MONTHS.CATERING.TITLE',
    description: 'TASKS.9_MONTHS.CATERING.DESC',
  },
  {
    phase: '9_months',
    category: 'attire',
    title: 'TASKS.9_MONTHS.WEDDING_DRESS.TITLE',
    description: 'TASKS.9_MONTHS.WEDDING_DRESS.DESC',
  },

  // ─── 6 MESES ───────────────────────────────────────────────────
  {
    phase: '6_months',
    category: 'attire',
    title: 'TASKS.6_MONTHS.CONFIRM_DRESS.TITLE',
    description: 'TASKS.6_MONTHS.CONFIRM_DRESS.DESC',
  },
  {
    phase: '6_months',
    category: 'attire',
    title: 'TASKS.6_MONTHS.GROOM_SUIT.TITLE',
    description: 'TASKS.6_MONTHS.GROOM_SUIT.DESC',
  },
  {
    phase: '6_months',
    category: 'flowers',
    title: 'TASKS.6_MONTHS.FLORIST.TITLE',
    description: 'TASKS.6_MONTHS.FLORIST.DESC',
  },
  {
    phase: '6_months',
    category: 'cake',
    title: 'TASKS.6_MONTHS.CAKE.TITLE',
    description: 'TASKS.6_MONTHS.CAKE.DESC',
  },
  {
    phase: '6_months',
    category: 'honeymoon',
    title: 'TASKS.6_MONTHS.HONEYMOON.TITLE',
    description: 'TASKS.6_MONTHS.HONEYMOON.DESC',
  },
  {
    phase: '6_months',
    category: 'invitations',
    title: 'TASKS.6_MONTHS.INVITATIONS_DESIGN.TITLE',
    description: 'TASKS.6_MONTHS.INVITATIONS_DESIGN.DESC',
  },

  // ─── 3 MESES ───────────────────────────────────────────────────
  {
    phase: '3_months',
    category: 'invitations',
    title: 'TASKS.3_MONTHS.SEND_INVITATIONS.TITLE',
    description: 'TASKS.3_MONTHS.SEND_INVITATIONS.DESC',
  },
  {
    phase: '3_months',
    category: 'guests',
    title: 'TASKS.3_MONTHS.CONFIRM_GUEST_LIST.TITLE',
    description: 'TASKS.3_MONTHS.CONFIRM_GUEST_LIST.DESC',
  },
  {
    phase: '3_months',
    category: 'beauty',
    title: 'TASKS.3_MONTHS.BEAUTY.TITLE',
    description: 'TASKS.3_MONTHS.BEAUTY.DESC',
  },
  {
    phase: '3_months',
    category: 'rings',
    title: 'TASKS.3_MONTHS.RINGS.TITLE',
    description: 'TASKS.3_MONTHS.RINGS.DESC',
  },
  {
    phase: '3_months',
    category: 'transport',
    title: 'TASKS.3_MONTHS.TRANSPORT.TITLE',
    description: 'TASKS.3_MONTHS.TRANSPORT.DESC',
  },
  {
    phase: '3_months',
    category: 'accommodation',
    title: 'TASKS.3_MONTHS.ACCOMMODATION.TITLE',
    description: 'TASKS.3_MONTHS.ACCOMMODATION.DESC',
  },

  // ─── 1 MES ─────────────────────────────────────────────────────
  {
    phase: '1_month',
    category: 'guests',
    title: 'TASKS.1_MONTH.CONFIRM_CATERING_COUNT.TITLE',
    description: 'TASKS.1_MONTH.CONFIRM_CATERING_COUNT.DESC',
  },
  {
    phase: '1_month',
    category: 'venue',
    title: 'TASKS.1_MONTH.CONFIRM_VENDORS.TITLE',
    description: 'TASKS.1_MONTH.CONFIRM_VENDORS.DESC',
  },
  {
    phase: '1_month',
    category: 'attire',
    title: 'TASKS.1_MONTH.FINAL_FITTING.TITLE',
    description: 'TASKS.1_MONTH.FINAL_FITTING.DESC',
  },
  {
    phase: '1_month',
    category: 'tables',
    title: 'TASKS.1_MONTH.SEATING_PLAN.TITLE',
    description: 'TASKS.1_MONTH.SEATING_PLAN.DESC',
  },
  {
    phase: '1_month',
    category: 'ceremony',
    title: 'TASKS.1_MONTH.CEREMONY_ORDER.TITLE',
    description: 'TASKS.1_MONTH.CEREMONY_ORDER.DESC',
  },

  // ─── 1 SEMANA ──────────────────────────────────────────────────
  {
    phase: '1_week',
    category: 'legal',
    title: 'TASKS.1_WEEK.CONFIRM_OFFICIANT.TITLE',
    description: 'TASKS.1_WEEK.CONFIRM_OFFICIANT.DESC',
  },
  {
    phase: '1_week',
    category: 'budget',
    title: 'TASKS.1_WEEK.VENDOR_PAYMENTS.TITLE',
    description: 'TASKS.1_WEEK.VENDOR_PAYMENTS.DESC',
  },
  {
    phase: '1_week',
    category: 'beauty',
    title: 'TASKS.1_WEEK.CONFIRM_BEAUTY.TITLE',
    description: 'TASKS.1_WEEK.CONFIRM_BEAUTY.DESC',
  },
  {
    phase: '1_week',
    category: 'attire',
    title: 'TASKS.1_WEEK.PICK_UP_ATTIRE.TITLE',
    description: 'TASKS.1_WEEK.PICK_UP_ATTIRE.DESC',
  },
  {
    phase: '1_week',
    category: 'venue',
    title: 'TASKS.1_WEEK.FINAL_VENUE_VISIT.TITLE',
    description: 'TASKS.1_WEEK.FINAL_VENUE_VISIT.DESC',
  },
];

// Fases disponibles en orden cronológico
export const PHASES_ORDER = [
  '12_months',
  '9_months',
  '6_months',
  '3_months',
  '1_month',
  '1_week',
] as const;

export type TaskPhase = typeof PHASES_ORDER[number];

// Categorías disponibles
export const TASK_CATEGORIES = [
  'budget',
  'venue',
  'guests',
  'legal',
  'photography',
  'music',
  'catering',
  'attire',
  'flowers',
  'cake',
  'honeymoon',
  'invitations',
  'beauty',
  'rings',
  'transport',
  'accommodation',
  'tables',
  'ceremony',
] as const;

export type TaskCategory = typeof TASK_CATEGORIES[number];