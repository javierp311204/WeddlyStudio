const mongoose = require("mongoose");

const MesaSchema = new mongoose.Schema({
  nombre: String,
  tipo: String, 
  capacidad: { type: Number, default: 8 }
});

module.exports = mongoose.model("Mesa", MesaSchema);