const nodemailer = require('nodemailer');

// Configuración del transportador de email
const transporter = nodemailer.createTransport({
  service: 'gmail', // Puedes usar otros: 'outlook', 'yahoo', etc.
  auth: {
    user: process.env.EMAIL_USER || 'jperez.salas31@gmail.com', // Cambiar por tu email
    pass: process.env.EMAIL_PASS || 'heib fbaa xydg gwpj' // Contraseña de aplicación
  }
});

// Verificar conexión
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Error en configuración de email:', error);
  } else {
    console.log('✅ Servidor de email listo para enviar mensajes');
  }
});

module.exports = transporter;