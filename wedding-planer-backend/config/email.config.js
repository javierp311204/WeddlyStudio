const nodemailer = require('nodemailer');

// Configuración del transportador de email
const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user: process.env.EMAIL_USER || 'vuestrabodaof@gmail.com', 
    pass: process.env.EMAIL_PASS || 'oppo uvjv tuoe ajgj' 
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