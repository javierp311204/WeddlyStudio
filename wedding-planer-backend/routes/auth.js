const express = require("express");
const router = express.Router();
const Usuario = require("../models/Usuario");
const BodaConfig = require("../models/BodaConfig");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require('crypto'); 
const emailService = require('../services/emailService');
const { verificarLimiteBodas } = require('../middleware/checkLimits');

const SECRET_KEY = "tu_clave_secreta_boda_2024";

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

      // ✨ NUEVO: Verificar límite de bodas para usuarios existentes
      if (existeEmail) {
        const bodasActivas = await BodaConfig.countDocuments({ 
          adminEmail: email.toLowerCase() 
        });

        if (bodasActivas >= existeEmail.limites.maxBodas && existeEmail.limites.maxBodas !== Infinity) {
          return res.status(403).json({ 
            error: "Límite de bodas alcanzado",
            mensaje: `Tu plan ${existeEmail.plan} permite máximo ${existeEmail.limites.maxBodas} boda(s).`,
            limiteAlcanzado: true,
            planRecomendado: 'unlimited'
          });
        }
      }

      const nuevaBoda = new BodaConfig({
        codigoBoda: codigoLimpio,
        adminEmail: email.toLowerCase(),
        invitados: [] 
      });
      await nuevaBoda.save();
      console.log(`✨ Boda creada exitosamente: ${codigoLimpio}`);

    } else if (rol === "invitado") {
      // ... tu código de invitado existente ...
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(pass, salt);

    const tokenVerificacion = crypto.randomBytes(32).toString('hex');
    const tokenExpiracion = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const nuevoUsuario = new Usuario({
      email: email.toLowerCase(),
      pass: hashedPass,
      rol,
      codigoBoda: codigoLimpio,
      nick: nick,
      emailVerificado: false,
      tokenVerificacion: tokenVerificacion,
      tokenExpiracion: tokenExpiracion
      // Los límites se asignan automáticamente por el default 'free'
    });

    await nuevoUsuario.save();
    
    const emailEnviado = await emailService.enviarEmailVerificacion(
      email.toLowerCase(), 
      tokenVerificacion,
      nick
    );

    if (!emailEnviado.success) {
      console.warn('⚠️ Usuario creado pero no se pudo enviar el email de verificación');
    }
    
    console.log(`✅ Registro completado: ${email} (${rol})`);
    res.json({ 
      mensaje: "Cuenta creada. Revisa tu email para verificar tu cuenta.",
      emailEnviado: emailEnviado.success
    });

  } catch (error) {
    console.error("❌ Error en registro:", error);
    res.status(500).json({ error: "Error al registrar" });
  }
});

// LOGIN CON VALIDACIÓN DE EMAIL VERIFICADO
router.post("/login", async (req, res) => {
  try {
    const { email, pass } = req.body;
    const user = await Usuario.findOne({ email });

    if (!user)
      return res.status(401).json({ mensaje: "Usuario no encontrado" });

    // ✨ VALIDAR SI EL EMAIL ESTÁ VERIFICADO
    if (!user.emailVerificado) {
      return res.status(403).json({ 
        mensaje: "Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.",
        emailNoVerificado: true
      });
    }

    const esValida = await bcrypt.compare(pass, user.pass);
    if (!esValida)
      return res.status(401).json({ mensaje: "Contraseña incorrecta" });

    const token = jwt.sign(
      { id: user._id, rol: user.rol, codigoBoda: user.codigoBoda, nick: user.nick },
      SECRET_KEY,
      { expiresIn: "24h" }
    );

    const tipoUsuario = user.rol === 'admin' ? 'admin' : 'invitado';

    res.json({
      success: true,
      token,
      rol: user.rol,
      codigoBoda: user.codigoBoda,
      nick: user.nick,
      tipoUsuario: tipoUsuario
    });

  } catch (error) {
    console.error("❌ Error en login:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// VERIFICAR EMAIL
router.get("/verificar-email/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const usuario = await Usuario.findOne({
      tokenVerificacion: token,
      tokenExpiracion: { $gt: Date.now() }
    });

    if (!usuario) {
      return res.status(400).json({ 
        error: "Token inválido o expirado. Por favor, solicita un nuevo correo de verificación." 
      });
    }

    usuario.emailVerificado = true;
    usuario.tokenVerificacion = undefined;
    usuario.tokenExpiracion = undefined;
    await usuario.save();

    console.log(`✅ Email verificado: ${usuario.email}`);
    res.json({ 
      success: true,
      mensaje: "¡Email verificado exitosamente! Ya puedes iniciar sesión." 
    });

  } catch (error) {
    console.error("❌ Error verificando email:", error);
    res.status(500).json({ error: "Error al verificar email" });
  }
});

// SOLICITAR RECUPERACIÓN DE CONTRASEÑA
router.post("/solicitar-recuperacion", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "El email es obligatorio" });
    }

    const usuario = await Usuario.findOne({ email: email.toLowerCase() });

    // Por seguridad, siempre respondemos éxito aunque el email no exista
    if (!usuario) {
      return res.json({ 
        mensaje: "Si el email está registrado, recibirás instrucciones para recuperar tu contraseña." 
      });
    }

    // Generar token de recuperación
    const tokenRecuperacion = crypto.randomBytes(32).toString('hex');
    const tokenExpiracion = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hora

    usuario.tokenVerificacion = tokenRecuperacion;
    usuario.tokenExpiracion = tokenExpiracion;
    await usuario.save();

    // Enviar email de recuperación
    const emailEnviado = await emailService.enviarEmailRecuperacion(
      email.toLowerCase(), 
      tokenRecuperacion,
      usuario.nick
    );

    console.log(`✅ Email de recuperación enviado a ${email}`);
    res.json({ 
      mensaje: "Si el email está registrado, recibirás instrucciones para recuperar tu contraseña.",
      emailEnviado: emailEnviado.success
    });

  } catch (error) {
    console.error("❌ Error en solicitud de recuperación:", error);
    res.status(500).json({ error: "Error al procesar la solicitud" });
  }
});

// RESETEAR CONTRASEÑA CON TOKEN
router.post("/resetear-password", async (req, res) => {
  try {
    const { token, nuevaPassword } = req.body;

    if (!token || !nuevaPassword) {
      return res.status(400).json({ error: "Token y nueva contraseña son obligatorios" });
    }

    if (nuevaPassword.length < 6) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
    }

    const usuario = await Usuario.findOne({
      tokenVerificacion: token,
      tokenExpiracion: { $gt: Date.now() }
    });

    if (!usuario) {
      return res.status(400).json({ 
        error: "Token inválido o expirado. Por favor, solicita un nuevo correo de recuperación." 
      });
    }

    // Hashear nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(nuevaPassword, salt);

    usuario.pass = hashedPass;
    usuario.tokenVerificacion = undefined;
    usuario.tokenExpiracion = undefined;
    await usuario.save();

    console.log(`✅ Contraseña reseteada para: ${usuario.email}`);
    res.json({ 
      success: true,
      mensaje: "Contraseña actualizada exitosamente. Ya puedes iniciar sesión." 
    });

  } catch (error) {
    console.error("❌ Error reseteando contraseña:", error);
    res.status(500).json({ error: "Error al resetear contraseña" });
  }
});

module.exports = router;