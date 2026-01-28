const express = require("express");
const router = express.Router();
const Usuario = require("../models/Usuario");
const BodaConfig = require("../models/BodaConfig");
const bcrypt = require("bcryptjs"); // Para encriptar
const jwt = require("jsonwebtoken"); // Para el Token

const SECRET_KEY = "tu_clave_secreta_boda_2024"; // ¡Usa una frase larga!

// REGISTRO
router.post("/registro", async (req, res) => {
  console.log("=== POST /registro ===");
  console.log("Body:", req.body);

  try {
    const { email, pass, rol, codigoBoda, nick } = req.body;

    if (!email || !pass || !codigoBoda || !nick) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    const codigoLimpio = codigoBoda.toUpperCase().trim();

    const existeEmail = await Usuario.findOne({ email: email.toLowerCase() });
    if (existeEmail) {
      return res.status(400).json({ error: "Este email ya está registrado" });
    }

    let bodaExiste = await BodaConfig.findOne({ codigoBoda: codigoLimpio });

    if (rol === "admin") {
      if (bodaExiste) {
        return res.status(400).json({ error: "Este código de boda ya está en uso. Elige otro." });
      }

      const nuevaBoda = new BodaConfig({
        codigoBoda: codigoLimpio,
        adminEmail: email.toLowerCase(),
        invitados: [] 
      });
      await nuevaBoda.save();
      console.log(`✨ Boda creada exitosamente: ${codigoLimpio}`);

    } else if (rol === "invitado") {
      if (!bodaExiste) {
        return res.status(404).json({ error: "Código de boda no válido" });
      }

      const invitadoEnLista = bodaExiste.invitados.find(
        inv => inv.email && inv.email.toLowerCase() === email.toLowerCase()
      );

      if (!invitadoEnLista) {
        return res.status(403).json({ 
          error: "Tu email no está en la lista de invitados de esta boda." 
        });
      }

      if (invitadoEnLista.registrado) {
        return res.status(400).json({ error: "Este email ya fue usado." });
      }

      await BodaConfig.updateOne(
        { codigoBoda: codigoLimpio, "invitados._id": invitadoEnLista._id },
        { $set: { "invitados.$.registrado": true, "invitados.$.nick": nick } }
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(pass, salt);

    const nuevoUsuario = new Usuario({
      email: email.toLowerCase(),
      pass: hashedPass,
      rol,
      codigoBoda: codigoLimpio,
      nick: nick
    });

    await nuevoUsuario.save();
    
    console.log(`✅ Registro completado: ${email} (${rol})`);
    res.json({ mensaje: "Usuario creado con éxito" });

  } catch (error) {
    console.error("❌ Error en registro:", error);
    res.status(500).json({ error: "Error al registrar" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, pass } = req.body;
    const user = await Usuario.findOne({ email });

    if (!user)
      return res.status(401).json({ mensaje: "Usuario no encontrado" });

    // 2. Comparar la contraseña enviada con la de la BD
    const esValida = await bcrypt.compare(pass, user.pass);
    if (!esValida)
      return res.status(401).json({ mensaje: "Contraseña incorrecta" });

    // 3. Generar el Token JWT
    const token = jwt.sign(
      { id: user._id, rol: user.rol, codigoBoda: user.codigoBoda },
      SECRET_KEY,
      { expiresIn: "24h" }
    );

    res.json({
      success: true,
      token,
      rol: user.rol,
      codigoBoda: user.codigoBoda,
      nick: user.nick,
    });
  } catch (error) {
    res.status(500).json({ error: "Error en el servidor" });
  }
});

module.exports = router;
