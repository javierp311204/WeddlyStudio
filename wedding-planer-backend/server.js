require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const autenticar = require("./middleware/auth");

app.use(cors());

app.use('/api/pagos/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static('uploads'));

if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');

mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/weddingDB")
  .then(() => console.log("✅ Servidor Modular Conectado"))
  .catch(err => console.error("❌ Error DB:", err));

// REGISTRO DE RUTAS CON MANEJO DE ERRORES
try {
  const albumRoutes = require('./routes/album');
  app.use('/api/album', albumRoutes);
  console.log("✅ Rutas de álbum cargadas correctamente");
} catch (error) {
  console.error("❌ ERROR al cargar routes/album.js:", error.message);
}

try {
  const authRoutes = require("./routes/auth");
  app.use("/api/auth", authRoutes);
  console.log("✅ Rutas de auth cargadas correctamente");
} catch (error) {
  console.error("❌ ERROR al cargar routes/auth.js:", error.message);
}

try {
  const gestionRoutes = require("./routes/gestion");
  app.use("/api/gestion", gestionRoutes);
  console.log("✅ Rutas de gestión cargadas correctamente");
} catch (error) {
  console.error("❌ ERROR al cargar routes/gestion.js:", error.message);
}

try {
  const notificacionRotues = require("./routes/notificaciones");
  app.use('/api/notificaciones', notificacionRotues);
  console.log("✅ Rutas de notificaciones cargadas correctamente");
} catch (error) {
  console.error("❌ ERROR al cargar routes/notificaciones.js:", error.message);
}

try {
  const apiRotues = require("./routes/plano");
  app.use('/api/plano', apiRotues);
  console.log("✅ Rutas de plano cargadas correctamente");
} catch (error) {
  console.error("❌ ERROR al cargar routes/plano.js:", error.message);
}

try {
  const pagosRoutes = require('./routes/pagos');
  app.use('/api/pagos', pagosRoutes);
  console.log("✅ Rutas de pagos cargadas correctamente");
} catch (error) {
  console.error("❌ ERROR al cargar routes/pagos.js:", error.message);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));