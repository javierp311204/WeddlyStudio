const mongoose = require("mongoose");

const InvitadoSchema = new mongoose.Schema({
  nombre: String,
  email: String,
  tipo: String, 
  menu: String,
  mesa: String,
  nick: { type: String, default: "" }, 
  registrado: { type: Boolean, default: false }
});

module.exports = mongoose.model("Invitado", InvitadoSchema);