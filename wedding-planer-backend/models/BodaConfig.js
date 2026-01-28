const mongoose = require("mongoose");

const AsientoSchema = new mongoose.Schema({
  posicion: Number,
  invitado_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Invitado' },
  ocupado: { type: Boolean, default: false }
});

const InvitadoSchema = new mongoose.Schema({
  nombre: String,
  email: String,
  tipo: String,
  menu: String,
  mesa: String,
  nick: { type: String, default: "" },
  registrado: { type: Boolean, default: false },
  // Nuevos campos para el plano
  alergias: { type: String, default: "" },
  notas: { type: String, default: "" },
  confirmado: { type: Boolean, default: false }
});

const MesaSchema = new mongoose.Schema({
  nombre: String,
  tipo: String,
  capacidad: { type: Number, default: 8 },
  posicion: {
    x: { type: Number, default: 50 }, 
    y: { type: Number, default: 50 }  
  },
  radio: { type: Number, default: 60 }, 
  asientos: [AsientoSchema]
});

const FincaSchema = new mongoose.Schema({
  nombre: String,
  dimensiones: {
    largo: Number,
    ancho: Number  
  },
  obstaculos: [{
    tipo: String, 
    posicion: {
      x: Number,
      y: Number
    },
    dimensiones: {
      ancho: Number,
      alto: Number
    }
  }],
  capacidadMaxMesas: { type: Number, default: 20 }
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
  mesas: [MesaSchema],
  finca: FincaSchema 
});

module.exports = mongoose.model("BodaConfig", BodaConfigSchema);