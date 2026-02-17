const mongoose = require('mongoose');

const tareaSchema = new mongoose.Schema({
  titulo: { type: String, required: true, trim: true },
  descripcion: { type: String, default: '' },
  fase: {
    type: String,
    required: true,
    enum: ['seis_meses', 'tres_meses', 'un_mes', 'una_semana', 'un_dia']
  },
  categoria: {
    type: String,
    enum: ['venue', 'catering', 'invitaciones', 'decoracion', 'musica', 'fotografia', 'legal', 'otro'],
    default: 'otro'
  },
  estado: {
    type: String,
    enum: ['pendiente', 'en_progreso', 'completada'],
    default: 'pendiente'
  },
  fechaLimite: { type: Date },
  recordatorio: {
    activo: { type: Boolean, default: false },
    diasAntes: { type: Number, default: 3 },
    enviado: { type: Boolean, default: false }
  },
  notas: { type: String, default: '' },
  fechaCompletada: { type: Date }
});

const checklistSchema = new mongoose.Schema({
  codigoBoda: { type: String, required: true, unique: true, index: true },
  creadoPor: { type: String, required: true },
  tareas: [tareaSchema]
}, { timestamps: true });

module.exports = mongoose.model('Checklist', checklistSchema);