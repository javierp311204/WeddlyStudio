const transporter = require("../config/email.config");

class EmailService {
  // Enviar invitación individual
  async enviarInvitacion(destinatario, datosInvitacion, pdfBuffer) {
    const { nombreNovia, nombreNovio, fecha, nombreInvitado } = datosInvitacion;

    const mailOptions = {
      from: `"${nombreNovia} & ${nombreNovio}" <${process.env.EMAIL_USER}>`,
      to: destinatario,
      subject: `💌 ¡Estás invitado a nuestra boda!`,
      html: this.generarHTMLEmail(datosInvitacion),
      attachments: pdfBuffer
        ? [
            {
              filename: `Invitacion_${nombreNovia}_${nombreNovio}.pdf`,
              content: pdfBuffer,
              contentType: "application/pdf",
            },
          ]
        : [],
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email enviado a ${destinatario}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`❌ Error enviando email a ${destinatario}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Enviar a múltiples invitados
  async enviarInvitacionMasiva(listaInvitados, datosInvitacion, pdfBuffer) {
    const resultados = [];

    for (const invitado of listaInvitados) {
      const datos = {
        ...datosInvitacion,
        nombreInvitado: invitado.nombre,
      };

      const resultado = await this.enviarInvitacion(
        invitado.email,
        datos,
        pdfBuffer,
      );

      resultados.push({
        email: invitado.email,
        nombre: invitado.nombre,
        ...resultado,
      });

      // Esperar 1 segundo entre emails para no saturar
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return resultados;
  }

  async enviarEmailVerificacion(
    destinatario,
    tokenVerificacion,
    nombreUsuario,
  ) {
    const urlVerificacion = `http://localhost:4200/verificar-email?token=${tokenVerificacion}`;

    const mailOptions = {
      from: `"Weddly Studio " <${process.env.EMAIL_USER}>`,
      to: destinatario,
      subject: "Verifica tu cuenta - Weddly Studio",
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: 'Arial', sans-serif;
            background-color: #f8f5f2;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: white;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #d4a373 0%, #b8935f 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
          }
          .header h1 {
            margin: 0;
            font-size: 1.8rem;
            font-weight: 300;
            letter-spacing: 2px;
          }
          .content {
            padding: 40px 30px;
            text-align: center;
            color: #2c2c2c;
          }
          .welcome {
            font-size: 1.3rem;
            color: #606c38;
            margin: 20px 0;
          }
          .message {
            font-size: 1rem;
            color: #6b6b6b;
            line-height: 1.6;
            margin: 20px 0;
          }
          .cta-button {
            display: inline-block;
            padding: 15px 40px;
            background: #d4a373;
            color: white;
            text-decoration: none;
            border-radius: 50px;
            font-weight: bold;
            margin: 30px 0;
            transition: transform 0.3s ease;
          }
          .cta-button:hover {
            transform: translateY(-2px);
            background: #bc8a5f;
          }
          .footer {
            background: #f8f5f2;
            padding: 30px;
            text-align: center;
            color: #8b7e74;
            font-size: 0.9rem;
          }
          .divider {
            width: 60px;
            height: 3px;
            background: #d4a373;
            margin: 20px auto;
          }
          .warning {
            background: #fff9e6;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            text-align: left;
            font-size: 0.9rem;
            color: #856404;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>¡BIENVENIDO/A!</h1>
          </div>
          
          <div class="content">
            <p class="welcome">
              Hola <strong>${nombreUsuario}</strong>
            </p>
            
            <div class="divider"></div>
            
            <p class="message">
              ¡Gracias por registrarte en Weddly Studio!<br>
              Estás a un solo paso de comenzar a organizar la boda perfecta.
            </p>
            
            <p class="message">
              Para completar tu registro, por favor verifica tu correo electrónico haciendo clic en el botón de abajo:
            </p>
            
            <a href="${urlVerificacion}" class="cta-button">
              ✓ Verificar mi cuenta
            </a>
            
            <div class="warning">
              <strong>⚠️ Importante:</strong> Este enlace expirará en 24 horas por seguridad.
            </div>
            
            <p style="font-size: 0.85rem; color: #999; margin-top: 30px;">
              Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:<br>
              <a href="${urlVerificacion}" style="color: #d4a373; word-break: break-all;">${urlVerificacion}</a>
            </p>
          </div>
          
          <div class="footer">
            <p>Si no creaste esta cuenta, puedes ignorar este correo.</p>
            <p style="font-size: 0.8rem; margin-top: 15px;">
              © 2025 Wedding Planner - Creando momentos inolvidables ✨
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(
        `✅ Email de verificación enviado a ${destinatario}: ${info.messageId}`,
      );
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(
        `❌ Error enviando email de verificación a ${destinatario}:`,
        error,
      );
      return { success: false, error: error.message };
    }
  }

  // Enviar email de recuperación de contraseña
  async enviarEmailRecuperacion(destinatario, tokenRecuperacion, nombreUsuario) {
  const urlRecuperacion = `http://localhost:4200/resetear-password?token=${tokenRecuperacion}`;

  const mailOptions = {
    from: `"Wedding Planner " <${process.env.EMAIL_USER}>`,
    to: destinatario,
    subject: 'Recuperación de Contraseña - Wedding Planner',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: 'Arial', sans-serif;
            background-color: #f8f5f2;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: white;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #606c38 0%, #283618 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
          }
          .header h1 {
            margin: 0;
            font-size: 1.8rem;
            font-weight: 300;
            letter-spacing: 2px;
          }
          .content {
            padding: 40px 30px;
            text-align: center;
            color: #2c2c2c;
          }
          .welcome {
            font-size: 1.3rem;
            color: #606c38;
            margin: 20px 0;
          }
          .message {
            font-size: 1rem;
            color: #6b6b6b;
            line-height: 1.6;
            margin: 20px 0;
          }
          .cta-button {
            display: inline-block;
            padding: 15px 40px;
            background: #606c38;
            color: white;
            text-decoration: none;
            border-radius: 50px;
            font-weight: bold;
            margin: 30px 0;
            transition: transform 0.3s ease;
          }
          .cta-button:hover {
            transform: translateY(-2px);
            background: #283618;
          }
          .footer {
            background: #f8f5f2;
            padding: 30px;
            text-align: center;
            color: #8b7e74;
            font-size: 0.9rem;
          }
          .divider {
            width: 60px;
            height: 3px;
            background: #606c38;
            margin: 20px auto;
          }
          .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            text-align: left;
            font-size: 0.9rem;
            color: #856404;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>RECUPERACIÓN DE CONTRASEÑA</h1>
          </div>
          
          <div class="content">
            <p class="welcome">
              Hola <strong>${nombreUsuario}</strong>
            </p>
            
            <div class="divider"></div>
            
            <p class="message">
              Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en Wedding Planner Vuestra Boda.
            </p>
            
            <p class="message">
              Si fuiste tú quien solicitó este cambio, haz clic en el botón de abajo para crear una nueva contraseña:
            </p>
            
            <a href="${urlRecuperacion}" class="cta-button">
              Restablecer Contraseña
            </a>
            
            <div class="warning">
              <strong>Importante:</strong> 
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Este enlace expirará en 1 hora por seguridad</li>
                <li>Si no solicitaste este cambio, ignora este correo</li>
                <li>Nunca compartas este enlace con nadie</li>
              </ul>
            </div>
            
            <p style="font-size: 0.85rem; color: #999; margin-top: 30px;">
              Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:<br>
              <a href="${urlRecuperacion}" style="color: #606c38; word-break: break-all;">${urlRecuperacion}</a>
            </p>
          </div>
          
          <div class="footer">
            <p>Si no solicitaste este cambio, tu cuenta está segura.</p>
            <p style="font-size: 0.8rem; margin-top: 15px;">
              © 2025 Wedding Planner - Creando momentos inolvidables 
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email de recuperación enviado a ${destinatario}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Error enviando email de recuperación a ${destinatario}:`, error);
    return { success: false, error: error.message };
  }
  }

  // Template HTML del email
  generarHTMLEmail(datos) {
    const {
      nombreNovia,
      nombreNovio,
      fecha,
      nombreInvitado,
      textoExtra,
      colorTexto,
    } = datos;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: 'Arial', sans-serif;
            background-color: #f8f5f2;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: white;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, ${colorTexto || "#d4a373"} 0%, #b8935f 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
          }
          .header h1 {
            margin: 0;
            font-size: 2rem;
            font-weight: 300;
            letter-spacing: 3px;
          }
          .content {
            padding: 40px 30px;
            text-align: center;
            color: #2c2c2c;
          }
          .nombres {
            font-size: 2.5rem;
            font-family: 'Georgia', serif;
            color: ${colorTexto || "#d4a373"};
            margin: 20px 0;
            line-height: 1.4;
          }
          .fecha {
            font-size: 1.2rem;
            color: #6b6b6b;
            margin: 20px 0;
          }
          .mensaje {
            font-size: 1rem;
            color: #8b7e74;
            line-height: 1.6;
            margin: 30px 0;
            font-style: italic;
          }
          .cta-button {
            display: inline-block;
            padding: 15px 40px;
            background: ${colorTexto || "#d4a373"};
            color: white;
            text-decoration: none;
            border-radius: 50px;
            font-weight: bold;
            margin: 20px 0;
            transition: transform 0.3s ease;
          }
          .cta-button:hover {
            transform: translateY(-2px);
          }
          .footer {
            background: #f8f5f2;
            padding: 30px;
            text-align: center;
            color: #8b7e74;
            font-size: 0.9rem;
          }
          .divider {
            width: 60px;
            height: 3px;
            background: ${colorTexto || "#d4a373"};
            margin: 20px auto;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>¡NOS CASAMOS!</h1>
          </div>
          
          <div class="content">
            <p style="font-size: 1.1rem; color: #6b6b6b;">
              Querido/a <strong>${nombreInvitado || "Invitado"}</strong>,
            </p>
            
            <div class="divider"></div>
            
            <div class="nombres">
              ${nombreNovia}<br>
              &<br>
              ${nombreNovio}
            </div>
            
            <p class="fecha">
               ${new Date(fecha).toLocaleDateString("es-ES", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            
            <p class="mensaje">
              ${textoExtra || "¡Tu presencia es nuestro mejor regalo!"}
            </p>
            
            <div class="divider"></div>
            
            <p style="margin: 30px 0;">
              Adjunto encontrarás tu invitación personalizada.<br>
              Por favor, confirma tu asistencia lo antes posible.
            </p>
            
            <a href="#" class="cta-button">
              ✓ Confirmar Asistencia
            </a>
          </div>
          
          <div class="footer">
            <p>Esperamos verte en nuestro gran día</p>
            <p style="font-size: 0.8rem; margin-top: 15px;">
              Este es un mensaje automático, por favor no responder a este correo.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();
