const mongoose = require('mongoose');

const NotificacionSchema = new mongoose.Schema({
  usuarioDestino: { type: String, required: true },
  
  codigoBoda: { type: String, required: true },
  
  titulo: { type: String, required: true },
  mensaje: { type: String, required: true },
  
  tipo: { type: String, default: 'info' },
  
  leida: { type: Boolean, default: false },
  fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notificacion', NotificacionSchema);