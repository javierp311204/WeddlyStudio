const express = require('express');
const router = express.Router();
const Checklist = require('../models/Tarea'); // ✅ modelo correcto (exporta 'Checklist')
const authMiddleware = require('../middleware/auth');

// ============================================
// TEMPLATE DE TAREAS PREDEFINIDAS
// ============================================
const TAREAS_TEMPLATE = {
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

// ============================================
// MIDDLEWARE
// ============================================
router.use(authMiddleware);

// ============================================
// POST - Inicializar checklist (sin parámetro dinámico, va primero)
// ============================================
router.post('/inicializar', async (req, res) => {
  try {
    const { codigoBoda } = req.body;
    const creadoPor = req.usuarioData.rol;

    const existente = await Checklist.findOne({ codigoBoda });
    if (existente) {
      return res.status(400).json({ error: 'Ya existe un checklist para esta boda' });
    }

    const tareas = [];
    for (const [fase, tareasFase] of Object.entries(TAREAS_TEMPLATE)) {
      for (const t of tareasFase) {
        tareas.push({ ...t, fase, estado: 'pendiente' });
      }
    }

    const checklist = await Checklist.create({ codigoBoda, creadoPor, tareas });
    res.json({ mensaje: 'Checklist inicializado', cantidad: checklist.tareas.length });
  } catch (error) {
    console.error('Error inicializando checklist:', error);
    res.status(500).json({ error: 'Error al inicializar' });
  }
});

// ============================================
// GET - Verificar si existe (ANTES de /:codigoBoda)
// ============================================
router.get('/:codigoBoda/verificar', async (req, res) => {
  try {
    const checklist = await Checklist.findOne({ codigoBoda: req.params.codigoBoda });
    res.json({ existe: !!checklist, cantidad: checklist?.tareas.length || 0 });
  } catch (error) {
    console.error('Error verificando checklist:', error);
    res.status(500).json({ error: 'Error al verificar' });
  }
});

// ============================================
// GET - Estadísticas (ANTES de /:codigoBoda)
// ============================================
router.get('/:codigoBoda/estadisticas', async (req, res) => {
  try {
    const checklist = await Checklist.findOne({ codigoBoda: req.params.codigoBoda });
    if (!checklist) return res.status(404).json({ error: 'Checklist no encontrado' });

    const tareas = checklist.tareas;
    const total = tareas.length;
    const completadas = tareas.filter(t => t.estado === 'completada').length;
    const enProgreso = tareas.filter(t => t.estado === 'en_progreso').length;
    const pendientes = tareas.filter(t => t.estado === 'pendiente').length;

    const fases = ['seis_meses', 'tres_meses', 'un_mes', 'una_semana', 'un_dia'];
    const porFase = fases.map(fase => {
      const tareasFase = tareas.filter(t => t.fase === fase);
      const completadasFase = tareasFase.filter(t => t.estado === 'completada').length;
      return {
        fase,
        total: tareasFase.length,
        completadas: completadasFase,
        porcentaje: tareasFase.length > 0 ? Math.round((completadasFase / tareasFase.length) * 100) : 0
      };
    });

    res.json({
      total,
      completadas,
      enProgreso,
      pendientes,
      porcentajeTotal: total > 0 ? Math.round((completadas / total) * 100) : 0,
      porFase
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// ============================================
// GET - Recordatorios pendientes (ANTES de /:codigoBoda)
// ============================================
router.get('/:codigoBoda/recordatorios', async (req, res) => {
  try {
    const checklist = await Checklist.findOne({ codigoBoda: req.params.codigoBoda });
    if (!checklist) return res.status(404).json({ error: 'Checklist no encontrado' });

    const recordatorios = checklist.tareas.filter(
      t => t.recordatorio?.activo && !t.recordatorio?.enviado && t.estado !== 'completada'
    );
    res.json(recordatorios);
  } catch (error) {
    console.error('Error obteniendo recordatorios:', error);
    res.status(500).json({ error: 'Error al obtener recordatorios' });
  }
});

// ============================================
// GET - Tareas por fase (ANTES de /:codigoBoda)
// ============================================
router.get('/:codigoBoda/fase/:fase', async (req, res) => {
  try {
    const checklist = await Checklist.findOne({ codigoBoda: req.params.codigoBoda });
    if (!checklist) return res.status(404).json({ error: 'Checklist no encontrado' });
    const tareasFase = checklist.tareas.filter(t => t.fase === req.params.fase);
    res.json(tareasFase);
  } catch (error) {
    console.error('Error obteniendo tareas por fase:', error);
    res.status(500).json({ error: 'Error al obtener tareas' });
  }
});

// ============================================
// GET - Checklist completo (DESPUÉS de las rutas específicas)
// ============================================
router.get('/:codigoBoda', async (req, res) => {
  try {
    const checklist = await Checklist.findOne({ codigoBoda: req.params.codigoBoda });
    if (!checklist) return res.status(404).json({ error: 'Checklist no encontrado' });
    res.json(checklist);
  } catch (error) {
    console.error('Error obteniendo checklist:', error);
    res.status(500).json({ error: 'Error al obtener checklist' });
  }
});

// ============================================
// POST - Agregar tarea individual
// ============================================
router.post('/:codigoBoda/tarea', async (req, res) => {
  try {
    const checklist = await Checklist.findOne({ codigoBoda: req.params.codigoBoda });
    if (!checklist) return res.status(404).json({ error: 'Checklist no encontrado' });

    checklist.tareas.push(req.body);
    await checklist.save();

    const nuevaTarea = checklist.tareas[checklist.tareas.length - 1];
    res.status(201).json(nuevaTarea);
  } catch (error) {
    console.error('Error creando tarea:', error);
    res.status(500).json({ error: 'Error al crear tarea' });
  }
});

// ============================================
// PUT - Actualizar tarea completa
// ============================================
router.put('/:codigoBoda/tarea/:tareaId', async (req, res) => {
  try {
    const checklist = await Checklist.findOne({ codigoBoda: req.params.codigoBoda });
    if (!checklist) return res.status(404).json({ error: 'Checklist no encontrado' });

    const tarea = checklist.tareas.id(req.params.tareaId);
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });

    Object.assign(tarea, req.body);
    await checklist.save();
    res.json(tarea);
  } catch (error) {
    console.error('Error actualizando tarea:', error);
    res.status(500).json({ error: 'Error al actualizar tarea' });
  }
});

// ============================================
// PATCH - Cambiar estado de tarea
// ============================================
router.patch('/:codigoBoda/tarea/:tareaId/estado', async (req, res) => {
  try {
    const checklist = await Checklist.findOne({ codigoBoda: req.params.codigoBoda });
    if (!checklist) return res.status(404).json({ error: 'Checklist no encontrado' });

    const tarea = checklist.tareas.id(req.params.tareaId);
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });

    tarea.estado = req.body.estado;
    if (req.body.estado === 'completada') {
      tarea.fechaCompletada = new Date();
    } else {
      tarea.fechaCompletada = undefined;
    }

    await checklist.save();
    res.json(tarea);
  } catch (error) {
    console.error('Error cambiando estado:', error);
    res.status(500).json({ error: 'Error al cambiar estado' });
  }
});

// ============================================
// PATCH - Configurar recordatorio
// ============================================
router.patch('/:codigoBoda/tarea/:tareaId/recordatorio', async (req, res) => {
  try {
    const checklist = await Checklist.findOne({ codigoBoda: req.params.codigoBoda });
    if (!checklist) return res.status(404).json({ error: 'Checklist no encontrado' });

    const tarea = checklist.tareas.id(req.params.tareaId);
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });

    tarea.recordatorio = {
      activo: req.body.activo,
      diasAntes: req.body.diasAntes || 3,
      enviado: false
    };

    await checklist.save();
    res.json(tarea);
  } catch (error) {
    console.error('Error configurando recordatorio:', error);
    res.status(500).json({ error: 'Error al configurar recordatorio' });
  }
});

// ============================================
// DELETE - Eliminar tarea
// ============================================
router.delete('/:codigoBoda/tarea/:tareaId', async (req, res) => {
  try {
    const checklist = await Checklist.findOne({ codigoBoda: req.params.codigoBoda });
    if (!checklist) return res.status(404).json({ error: 'Checklist no encontrado' });

    checklist.tareas.pull(req.params.tareaId);
    await checklist.save();
    res.json({ mensaje: 'Tarea eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando tarea:', error);
    res.status(500).json({ error: 'Error al eliminar tarea' });
  }
});

module.exports = router;