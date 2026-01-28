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

const MesaSchema = new mongoose.Schema({
  nombre: String,
  tipo: String, 
  capacidad: { type: Number, default: 10 }
});

const BodaConfigSchema = new mongoose.Schema({
  codigoBoda: { type: String, unique: true },
  lugarNombre: String,
  direccion: String,
  googleMapsLink: String,
  fechaHora: String,
  dressCode: String,
  menuResumen: String,
  invitados: [InvitadoSchema],
  mesas: [MesaSchema]
});

module.exports = mongoose.model("BodaConfig", BodaConfigSchema);