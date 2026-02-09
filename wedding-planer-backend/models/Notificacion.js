const mongoose = require('mongoose');

const NotificacionSchema = new mongoose.Schema({
  usuarioDestino: { type: String, required: true },
  tipoUsuario: { 
    type: String, 
    enum: ['admin', 'invitado'], 
    required: true,
    default: 'invitado'
  },
  codigoBoda: { type: String, required: true },
  titulo: { type: String, required: true },
  mensaje: { type: String, required: true },
  tipo: { 
    type: String, 
    enum: ['album', 'foto', 'info-boda', 'mesa', 'info', 'general'],
    default: 'info' 
  },
  ruta: { type: String },
  leida: { type: Boolean, default: false },
  fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notificacion', NotificacionSchema);