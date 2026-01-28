const express = require('express');
const router = express.Router();
const Notificacion = require('../models/Notificacion');
const autenticar = require('../middleware/auth');

// GET: Obtener notificaciones de un usuario específico
router.get('/:usuario', autenticar, async (req, res) => {
  try {
    const { codigoBoda } = req.query;
    const notificaciones = await Notificacion.find({ 
      usuarioDestino: req.params.usuario,
      codigoBoda: codigoBoda 
    }).sort({ fecha: -1 }); 
    
    res.json(notificaciones);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
});

// PUT: Marcar una notificación como leída
router.put('/leer/:id', autenticar, async (req, res) => {
  try {
    await Notificacion.findByIdAndUpdate(req.params.id, { leida: true });
    res.json({ mensaje: 'Notificación marcada como leída' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

module.exports = router;