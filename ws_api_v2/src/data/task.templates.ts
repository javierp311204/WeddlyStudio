// ============================================================
// WEDDLY — Plantillas de tareas predefinidas por fase
// Se usan al inicializar el checklist de una boda nueva
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
    title: 'Definir presupuesto total',
    description: 'Establece un presupuesto realista y reparte las partidas principales.',
  },
  {
    phase: '12_months',
    category: 'venue',
    title: 'Elegir y reservar el lugar de la ceremonia',
    description: 'Visita al menos 3 opciones antes de decidir. Confirma disponibilidad para tu fecha.',
  },
  {
    phase: '12_months',
    category: 'venue',
    title: 'Elegir y reservar el lugar del banquete',
    description: 'Puede ser el mismo que la ceremonia o uno diferente.',
  },
  {
    phase: '12_months',
    category: 'guests',
    title: 'Hacer lista preliminar de invitados',
    description: 'Número orientativo para negociar con el venue y el catering.',
  },
  {
    phase: '12_months',
    category: 'legal',
    title: 'Iniciar trámites legales del matrimonio',
    description: 'Consulta en el registro civil o notaría los documentos necesarios.',
  },

  // ─── 9 MESES ───────────────────────────────────────────────────
  {
    phase: '9_months',
    category: 'photography',
    title: 'Contratar fotógrafo',
    description: 'Revisa portfolios, lee reseñas y reserva con antelación.',
  },
  {
    phase: '9_months',
    category: 'photography',
    title: 'Contratar videógrafo',
    description: 'Opcional. Decide si quieres vídeo completo, highlights o drone.',
  },
  {
    phase: '9_months',
    category: 'music',
    title: 'Contratar música (DJ o banda)',
    description: 'Define el estilo musical para ceremonia, cóctel y banquete.',
  },
  {
    phase: '9_months',
    category: 'catering',
    title: 'Elegir servicio de catering',
    description: 'Solicita al menos 3 presupuestos. Organiza una degustación.',
  },
  {
    phase: '9_months',
    category: 'attire',
    title: 'Empezar búsqueda del vestido de novia',
    description: 'Los vestidos pueden tardar 4-6 meses en llegar. Empieza cuanto antes.',
  },

  // ─── 6 MESES ───────────────────────────────────────────────────
  {
    phase: '6_months',
    category: 'attire',
    title: 'Confirmar vestido de novia',
    description: 'Realiza el pedido oficial y programa las pruebas.',
  },
  {
    phase: '6_months',
    category: 'attire',
    title: 'Elegir traje del novio',
    description: 'Compra o alquiler. Coordinar con el estilo del vestido.',
  },
  {
    phase: '6_months',
    category: 'flowers',
    title: 'Contratar florista',
    description: 'Define el estilo floral: ramo, centros de mesa, decoración ceremonia.',
  },
  {
    phase: '6_months',
    category: 'cake',
    title: 'Elegir tarta nupcial',
    description: 'Organiza una degustación con al menos 2 pasteleros.',
  },
  {
    phase: '6_months',
    category: 'honeymoon',
    title: 'Planificar viaje de novios',
    description: 'Reserva vuelos y alojamiento con antelación para mejores precios.',
  },
  {
    phase: '6_months',
    category: 'invitations',
    title: 'Diseñar invitaciones',
    description: 'Define el diseño y texto. Recuerda incluir fecha límite de RSVP.',
  },

  // ─── 3 MESES ───────────────────────────────────────────────────
  {
    phase: '3_months',
    category: 'invitations',
    title: 'Enviar invitaciones',
    description: 'Envía con al menos 2-3 meses de antelación.',
  },
  {
    phase: '3_months',
    category: 'guests',
    title: 'Confirmar lista definitiva de invitados',
    description: 'Cierra la lista para comunicar número final al catering.',
  },
  {
    phase: '3_months',
    category: 'beauty',
    title: 'Reservar peluquería y maquillaje',
    description: 'Haz una prueba previa para confirmar el look.',
  },
  {
    phase: '3_months',
    category: 'rings',
    title: 'Encargar alianzas',
    description: 'Elige material, diseño y graba la inscripción si lo deseas.',
  },
  {
    phase: '3_months',
    category: 'transport',
    title: 'Contratar transporte nupcial',
    description: 'Coche de novios, autobús para invitados, etc.',
  },
  {
    phase: '3_months',
    category: 'accommodation',
    title: 'Gestionar alojamiento para invitados de fuera',
    description: 'Negocia tarifas especiales con hoteles cercanos.',
  },

  // ─── 1 MES ─────────────────────────────────────────────────────
  {
    phase: '1_month',
    category: 'guests',
    title: 'Confirmar número final de asistentes al catering',
    description: 'La mayoría de caterings pide confirmación 3-4 semanas antes.',
  },
  {
    phase: '1_month',
    category: 'venue',
    title: 'Confirmar detalles con todos los proveedores',
    description: 'Llama o escribe a cada proveedor para reconfirmar hora y detalles.',
  },
  {
    phase: '1_month',
    category: 'attire',
    title: 'Prueba final del vestido/traje',
    description: 'Asegúrate de que los ajustes están perfectos.',
  },
  {
    phase: '1_month',
    category: 'tables',
    title: 'Organizar la distribución de mesas',
    description: 'Asigna cada invitado a su mesa teniendo en cuenta afinidades.',
  },
  {
    phase: '1_month',
    category: 'ceremony',
    title: 'Preparar el orden de la ceremonia',
    description: 'Define lecturas, música, votos y tiempos.',
  },

  // ─── 1 SEMANA ──────────────────────────────────────────────────
  {
    phase: '1_week',
    category: 'legal',
    title: 'Confirmar hora y lugar con el officiant/juez',
    description: 'Último recordatorio para quien oficia la ceremonia.',
  },
  {
    phase: '1_week',
    category: 'budget',
    title: 'Preparar sobres con pagos para proveedores',
    description: 'Muchos proveedores cobran en efectivo el día de la boda.',
  },
  {
    phase: '1_week',
    category: 'beauty',
    title: 'Confirmar cita de peluquería y maquillaje',
    description: 'Confirma hora, lugar y número de personas.',
  },
  {
    phase: '1_week',
    category: 'attire',
    title: 'Recoger vestido/traje',
    description: 'Recoge y comprueba que todo esté en perfecto estado.',
  },
  {
    phase: '1_week',
    category: 'venue',
    title: 'Visita final al venue',
    description: 'Repasa la decoración, distribución de mesas y accesos.',
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