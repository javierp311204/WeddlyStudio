const mongoose = require("mongoose");

const UsuarioSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  pass: { type: String, required: true },
  rol: { type: String, default: 'invitado' },
  codigoBoda: String,
  nick: String,

  emailVerificado: { type: Boolean, default: false },
  tokenVerificacion: { type: String },
  tokenExpiracion: { type: Date }
}, {
  timestamps: true 
});

module.exports = mongoose.model("Usuario", UsuarioSchema);