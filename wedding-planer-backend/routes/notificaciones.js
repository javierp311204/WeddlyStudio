const express = require('express');
const router = express.Router();
const Notificacion = require('../models/Notificacion');
const BodaConfig = require('../models/BodaConfig');
const autenticar = require('../middleware/auth');

// GET: Obtener notificaciones de un usuario específico
router.get('/:usuario', autenticar, async (req, res) => {
  try {
    const { codigoBoda, tipoUsuario } = req.query; // ✅ Recibe tipoUsuario
    
    const filtro = { 
      usuarioDestino: req.params.usuario,
      codigoBoda: codigoBoda 
    };

    // ✅ Filtrar por tipoUsuario si se proporciona
    if (tipoUsuario) {
      filtro.tipoUsuario = tipoUsuario;
    }

    const notificaciones = await Notificacion.find(filtro).sort({ fecha: -1 }); 
    
    res.json(notificaciones);
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
});

// PUT: Marcar una notificación como leída
router.put('/leer/:id', autenticar, async (req, res) => {
  try {
    await Notificacion.findByIdAndUpdate(req.params.id, { leida: true });
    res.json({ mensaje: 'Notificación marcada como leída' });
  } catch (error) {
    console.error('Error al actualizar notificación:', error);
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

// POST: Crear notificación manual (para admins)
router.post('/crear', autenticar, async (req, res) => {
  console.log('=== POST /crear notificación ===');
  console.log('Body:', req.body);

  try {
    const { codigoBoda, titulo, mensaje, tipo, destinatarios, ruta, tipoUsuario } = req.body;

    if (!codigoBoda || !titulo || !mensaje) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    let notificacionesCreadas = 0;

    if (destinatarios === 'todos') {
      const boda = await BodaConfig.findOne({ codigoBoda });
      
      if (!boda) {
        return res.status(404).json({ error: 'Boda no encontrada' });
      }

      // ✅ Crear notificaciones solo para invitados
      for (const invitado of boda.invitados) {
        if (invitado.nick) {
          await Notificacion.create({
            usuarioDestino: invitado.nick,
            tipoUsuario: 'invitado', 
            codigoBoda,
            titulo,
            mensaje,
            tipo: tipo || 'general',
            ruta: ruta || null,
            leida: false
          });
          notificacionesCreadas++;
        }
      }
    } else if (Array.isArray(destinatarios)) {
      // ✅ Crear para usuarios específicos
      for (const nick of destinatarios) {
        await Notificacion.create({
          usuarioDestino: nick,
          tipoUsuario: tipoUsuario || 'invitado', 
          codigoBoda,
          titulo,
          mensaje,
          tipo: tipo || 'general',
          ruta: ruta || null,
          leida: false
        });
        notificacionesCreadas++;
      }
    } else {
      return res.status(400).json({ 
        error: 'destinatarios debe ser "todos" o un array de nicks' 
      });
    }

    console.log(`✅ ${notificacionesCreadas} notificaciones creadas`);

    res.json({ 
      mensaje: 'Notificaciones creadas exitosamente',
      cantidad: notificacionesCreadas
    });

  } catch (error) {
    console.error('❌ Error al crear notificaciones:', error);
    res.status(500).json({ error: 'Error al crear notificaciones' });
  }
});

// DELETE: Eliminar una notificación
router.delete('/:id', autenticar, async (req, res) => {
  try {
    await Notificacion.findByIdAndDelete(req.params.id);
    res.json({ mensaje: 'Notificación eliminada' });
  } catch (error) {
    console.error('Error al eliminar notificación:', error);
    res.status(500).json({ error: 'Error al eliminar notificación' });
  }
});

// DELETE: Eliminar todas las notificaciones leídas
router.delete('/limpiar/:usuario', autenticar, async (req, res) => {
  try {
    const { codigoBoda, tipoUsuario } = req.query; // ✅ Añadido tipoUsuario
    
    const filtro = {
      usuarioDestino: req.params.usuario,
      codigoBoda: codigoBoda,
      leida: true
    };

    // ✅ Filtrar por tipoUsuario si se proporciona
    if (tipoUsuario) {
      filtro.tipoUsuario = tipoUsuario;
    }

    const resultado = await Notificacion.deleteMany(filtro);

    res.json({ 
      mensaje: 'Notificaciones leídas eliminadas',
      cantidad: resultado.deletedCount
    });
  } catch (error) {
    console.error('Error al limpiar notificaciones:', error);
    res.status(500).json({ error: 'Error al limpiar notificaciones' });
  }
});

// PUT: Marcar todas como leídas
router.put('/leer-todas/:usuario', autenticar, async (req, res) => {
  try {
    const { codigoBoda, tipoUsuario } = req.query; // ✅ Añadido tipoUsuario
    
    const filtro = {
      usuarioDestino: req.params.usuario,
      codigoBoda: codigoBoda,
      leida: false
    };

    if (tipoUsuario) {
      filtro.tipoUsuario = tipoUsuario;
    }

    const resultado = await Notificacion.updateMany(filtro, { leida: true });

    res.json({ 
      mensaje: 'Todas las notificaciones marcadas como leídas',
      cantidad: resultado.modifiedCount
    });
  } catch (error) {
    console.error('Error al marcar todas como leídas:', error);
    res.status(500).json({ error: 'Error al marcar como leídas' });
  }
});

module.exports = router;