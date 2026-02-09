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
  // Campos para el plano
  alergias: { type: String, default: "" },
  notas: { type: String, default: "" },
  confirmado: { type: Boolean, default: false },
  
  // ✨ NUEVOS: Para invitaciones digitales
  uuid: { type: String, unique: true, sparse: true }, // ID único para link de invitación
  estadoRSVP: { 
    type: String, 
    enum: ['pendiente', 'confirmado', 'cancelado', 'tal_vez'], 
    default: 'pendiente' 
  },
  fechaRSVP: Date,
  numAcompanantes: { type: Number, default: 0 },
  nombreAcompanantes: [String],
  invitacionEnviada: { type: Boolean, default: false },
  fechaEnvioInvitacion: Date
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
  finca: FincaSchema,
  
  // ✨ NUEVO: Configuración de papelería e invitaciones
  configuracionPapeleria: {
    nombreNovia: String,
    nombreNovio: String,
    fecha: String,
    colorFondo: { type: String, default: '#ffffff' },
    colorTexto: { type: String, default: '#d4a373' },
    textoExtra: String,
    plantilla: { type: String, default: 'clasica' },
    imagenFondo: String,
    templateActivo: { type: mongoose.Schema.Types.ObjectId, ref: 'Template' }
  },
  
  // ✅ Alias más simple para la configuración de papelería
  papeleria: {
    nombreNovia: String,
    nombreNovio: String,
    fecha: String,
    colorFondo: { type: String, default: '#ffffff' },
    colorTexto: { type: String, default: '#d4a373' },
    textoExtra: String,
    plantilla: { type: String, default: 'clasica' },
    imagenFondo: String
  }
});

module.exports = mongoose.model("BodaConfig", BodaConfigSchema);