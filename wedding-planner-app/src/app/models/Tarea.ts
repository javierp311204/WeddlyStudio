// src/app/models/Tarea.ts - VERSIÓN CORREGIDA COMPLETA

export interface Tarea {
  _id?: string;
  codigoBoda: string;
  titulo: string;
  descripcion: string;
  fase: 'seis_meses' | 'tres_meses' | 'un_mes' | 'una_semana' | 'un_dia';
  categoria: 'venue' | 'catering' | 'invitaciones' | 'decoracion' | 'musica' | 'fotografia' | 'legal' | 'otro';
  estado: 'pendiente' | 'en_progreso' | 'completada';
  fechaLimite?: Date;
  recordatorio?: {
    activo: boolean;
    diasAntes: number;
    enviado: boolean;
  };
  notas?: string;
  creadaPor: string;
  fechaCreacion: Date;
  fechaCompletada?: Date;
}

export interface FaseChecklist {
  fase: string;
  titulo: string;
  descripcion: string;
  icon: string;
  color: string;
  tareas: Tarea[];
  progreso: number;
}

// ← AGREGAR ESTA INTERFAZ QUE FALTA
export interface FaseInfo {
  titulo: string;
  descripcion: string;
  icon: string;
  color: string;
}

// ← CAMBIAR EL TIPO DEL OBJETO
export const FASES_BODA: { [key: string]: FaseInfo } = {
  'seis_meses': {
    titulo: '6 Meses Antes',
    descripcion: 'Fundamentos y reservas principales',
    icon: '📅',
    color: '#d4a373'
  },
  'tres_meses': {
    titulo: '3 Meses Antes',
    descripcion: 'Detalles y confirmaciones',
    icon: '📋',
    color: '#bc6c25'
  },
  'un_mes': {
    titulo: '1 Mes Antes',
    descripcion: 'Ajustes finales',
    icon: '✨',
    color: '#8b7e74'
  },
  'una_semana': {
    titulo: '1 Semana Antes',
    descripcion: 'Últimos preparativos',
    icon: '🎯',
    color: '#606c38'
  },
  'un_dia': {
    titulo: '1 Día Antes',
    descripcion: 'Check final',
    icon: '💝',
    color: '#e63946'
  }
};

// ← AGREGAR ESTA INTERFAZ TAMBIÉN
export interface CategoriaInfo {
  nombre: string;
  icon: string;
}

export const CATEGORIAS_TAREA: { [key: string]: CategoriaInfo } = {
  'venue': { nombre: 'Lugar', icon: '🏛️' },
  'catering': { nombre: 'Catering', icon: '🍽️' },
  'invitaciones': { nombre: 'Invitaciones', icon: '💌' },
  'decoracion': { nombre: 'Decoración', icon: '🌸' },
  'musica': { nombre: 'Música', icon: '🎵' },
  'fotografia': { nombre: 'Fotografía', icon: '📸' },
  'legal': { nombre: 'Legal/Documentos', icon: '📄' },
  'otro': { nombre: 'Otro', icon: '📌' }
};

// Tareas predefinidas por fase
export const TAREAS_TEMPLATE: { [key: string]: Partial<Tarea>[] } = {
  'seis_meses': [
    { titulo: 'Reservar el lugar de la ceremonia', categoria: 'venue', descripcion: 'Contactar y confirmar disponibilidad del lugar' },
    { titulo: 'Reservar el lugar del banquete', categoria: 'venue', descripcion: 'Visitar opciones y firmar contrato' },
    { titulo: 'Contratar fotógrafo profesional', categoria: 'fotografia', descripcion: 'Ver portfolios y reservar fecha' },
    { titulo: 'Contratar servicio de catering', categoria: 'catering', descripcion: 'Hacer degustación y elegir menú' },
    { titulo: 'Buscar y probar vestido/traje', categoria: 'otro', descripcion: 'Programar pruebas con tiempo' },
    { titulo: 'Crear lista de invitados', categoria: 'invitaciones', descripcion: 'Definir cantidad y categorías' }
  ],
  'tres_meses': [
    { titulo: 'Enviar invitaciones', categoria: 'invitaciones', descripcion: 'Diseñar, imprimir y enviar' },
    { titulo: 'Contratar música/DJ', categoria: 'musica', descripcion: 'Definir playlist y contratar' },
    { titulo: 'Planificar luna de miel', categoria: 'otro', descripcion: 'Reservar vuelos y alojamiento' },
    { titulo: 'Comprar anillos de boda', categoria: 'otro', descripcion: 'Elegir diseño y grabar' },
    { titulo: 'Organizar prueba de menú', categoria: 'catering', descripcion: 'Confirmar platos finales' },
    { titulo: 'Contratar transporte', categoria: 'otro', descripcion: 'Reservar autos para el día' }
  ],
  'un_mes': [
    { titulo: 'Confirmar número final de invitados', categoria: 'invitaciones', descripcion: 'Contactar a quienes no respondieron' },
    { titulo: 'Hacer seating plan', categoria: 'venue', descripcion: 'Organizar mesas y asientos' },
    { titulo: 'Prueba final de vestido/traje', categoria: 'otro', descripcion: 'Ajustes finales' },
    { titulo: 'Ensayo de ceremonia', categoria: 'venue', descripcion: 'Coordinar con oficiante' },
    { titulo: 'Confirmar detalles con proveedores', categoria: 'otro', descripcion: 'Llamar a todos los servicios' },
    { titulo: 'Preparar discursos', categoria: 'otro', descripcion: 'Escribir y practicar palabras' }
  ],
  'una_semana': [
    { titulo: 'Entrega lista final al catering', categoria: 'catering', descripcion: 'Número exacto de comensales' },
    { titulo: 'Reconfirmar horarios con proveedores', categoria: 'otro', descripcion: 'Llamada de confirmación' },
    { titulo: 'Preparar kit de emergencia', categoria: 'otro', descripcion: 'Costura, medicinas, etc.' },
    { titulo: 'Organizar ensayo con padrinos', categoria: 'otro', descripcion: 'Coordinar entrada y protocolo' },
    { titulo: 'Confirmar timeline del día', categoria: 'otro', descripcion: 'Horarios exactos de cada momento' }
  ],
  'un_dia': [
    { titulo: 'Confirmar transporte está listo', categoria: 'otro', descripcion: 'Llamar al servicio' },
    { titulo: 'Empacar para luna de miel', categoria: 'otro', descripcion: 'Verificar documentos' },
    { titulo: 'Dormir bien', categoria: 'otro', descripcion: '¡Descansar es clave!' },
    { titulo: 'Preparar pagos para proveedores', categoria: 'otro', descripcion: 'Sobres con efectivo/cheques' },
    { titulo: 'Cargar teléfonos y cámaras', categoria: 'fotografia', descripcion: 'Todo con batería completa' }
  ]
};