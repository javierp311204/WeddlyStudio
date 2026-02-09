const transporter = require('../config/email.config');

class EmailService {
  
  // Enviar invitación individual
  async enviarInvitacion(destinatario, datosInvitacion, pdfBuffer) {
    const { nombreNovia, nombreNovio, fecha, nombreInvitado } = datosInvitacion;

    const mailOptions = {
      from: `"${nombreNovia} & ${nombreNovio}" <${process.env.EMAIL_USER}>`,
      to: destinatario,
      subject: `💌 ¡Estás invitado a nuestra boda!`,
      html: this.generarHTMLEmail(datosInvitacion),
      attachments: pdfBuffer ? [
        {
          filename: `Invitacion_${nombreNovia}_${nombreNovio}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ] : []
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
        nombreInvitado: invitado.nombre
      };

      const resultado = await this.enviarInvitacion(
        invitado.email, 
        datos, 
        pdfBuffer
      );

      resultados.push({
        email: invitado.email,
        nombre: invitado.nombre,
        ...resultado
      });

      // Esperar 1 segundo entre emails para no saturar
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return resultados;
  }

  // Template HTML del email
  generarHTMLEmail(datos) {
    const { nombreNovia, nombreNovio, fecha, nombreInvitado, textoExtra, colorTexto } = datos;

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
            background: linear-gradient(135deg, ${colorTexto || '#d4a373'} 0%, #b8935f 100%);
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
            color: ${colorTexto || '#d4a373'};
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
            background: ${colorTexto || '#d4a373'};
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
            background: ${colorTexto || '#d4a373'};
            margin: 20px auto;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💌 ¡NOS CASAMOS!</h1>
          </div>
          
          <div class="content">
            <p style="font-size: 1.1rem; color: #6b6b6b;">
              Querido/a <strong>${nombreInvitado || 'Invitado'}</strong>,
            </p>
            
            <div class="divider"></div>
            
            <div class="nombres">
              ${nombreNovia}<br>
              &<br>
              ${nombreNovio}
            </div>
            
            <p class="fecha">
              📅 ${new Date(fecha).toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
            
            <p class="mensaje">
              ${textoExtra || '¡Tu presencia es nuestro mejor regalo!'}
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
            <p>Esperamos verte en nuestro gran día ✨</p>
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