import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ─── Tipos ───────────────────────────────────────────────────────

export interface InvitationEmailData {
  to: string;
  guestName: string;
  weddingName: string;
  weddingDate: Date;
  locationName?: string | null;
  customText?: string | null;
  rsvpCode: string;
  primaryColor: string;
  secondaryColor: string;
  template: 'elegant' | 'modern' | 'rustic' | 'minimalist';
}

export interface VerificationEmailData {
  to: string;
  firstName: string;
  verificationToken: string;
}

export interface SendResult {
  success: boolean;
  error?: string;
}

export interface CollaboratorInviteEmailData {
  to:          string;
  inviterName: string;
  weddingName: string;
  role:        string;
  token:       string;
}

const ROLE_LABELS: Record<string, string> = {
  co_organizer: 'Co-organizador',
  planner:      'Wedding Planner',
  guest:        'Invitado',
};

export interface TfaResetEmailData {
  to:        string;
  firstName: string;
  token:     string;
}

// ─── Templates HTML ──────────────────────────────────────────────

function buildInvitationHtml(data: InvitationEmailData): string {
  const formattedDate = data.weddingDate.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const rsvpUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/rsvp/${data.rsvpCode}`;

  const styles: Record<InvitationEmailData['template'], string> = {
    elegant: `font-family:'Georgia',serif;background:#fdf8f3;border:2px solid ${data.primaryColor};`,
    modern: `font-family:'Helvetica Neue',sans-serif;background:#ffffff;border-left:6px solid ${data.primaryColor};`,
    rustic: `font-family:'Palatino Linotype',serif;background:#f5ede0;border:3px solid ${data.secondaryColor};`,
    minimalist: `font-family:'Arial',sans-serif;background:#ffffff;border-top:3px solid ${data.primaryColor};`,
  };

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitación — ${data.weddingName}</title>
</head>
<body style="margin:0;padding:20px;background:#f0f0f0;">
  <div style="max-width:600px;margin:0 auto;padding:40px;${styles[data.template]}border-radius:8px;">
    <h1 style="color:${data.primaryColor};text-align:center;margin-bottom:8px;">
      ${data.weddingName}
    </h1>
    <p style="text-align:center;color:#888;margin-bottom:32px;font-size:14px;">
      ${formattedDate}${data.locationName ? ` · ${data.locationName}` : ''}
    </p>
    <p style="font-size:16px;margin-bottom:8px;">
      Querido/a <strong>${data.guestName}</strong>,
    </p>
    ${
      data.customText
        ? `<p style="font-size:15px;line-height:1.7;color:#444;margin-bottom:24px;">${data.customText}</p>`
        : `<p style="font-size:15px;line-height:1.7;color:#444;margin-bottom:24px;">
            Tenemos el placer de invitarte a celebrar con nosotros el día más especial de nuestras vidas.
            Tu presencia sería un honor y una alegría.
          </p>`
    }
    <div style="text-align:center;margin:32px 0;">
      <a href="${rsvpUrl}"
         style="background:${data.primaryColor};color:#fff;padding:14px 32px;
                text-decoration:none;border-radius:4px;font-size:16px;font-weight:bold;
                display:inline-block;">
        Confirmar asistencia
      </a>
    </div>
    <p style="text-align:center;font-size:12px;color:#aaa;margin-top:32px;">
      O accede con tu código personal: <strong>${data.rsvpCode}</strong><br>
      <a href="${rsvpUrl}" style="color:${data.primaryColor};">${rsvpUrl}</a>
    </p>
  </div>
</body>
</html>`.trim();
}

function buildVerificationHtml(data: VerificationEmailData): string {
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email/${data.verificationToken}`;
  const brandColor = '#8B6F47';

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifica tu email — Weddly</title>
</head>
<body style="margin:0;padding:20px;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;">

    <!-- Header -->
    <div style="text-align:center;padding:40px 0 24px;">
      <h1 style="margin:0;font-size:28px;color:${brandColor};letter-spacing:1px;">Weddly</h1>
      <p style="margin:4px 0 0;font-size:13px;color:#aaa;letter-spacing:2px;text-transform:uppercase;">
        Studio
      </p>
    </div>

    <!-- Card -->
    <div style="background:#ffffff;border-radius:10px;padding:48px 40px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">

      <h2 style="margin:0 0 16px;font-size:22px;color:#222;font-weight:600;">
        Hola, ${data.firstName} 👋
      </h2>

      <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#555;">
        Gracias por unirte a <strong>Weddly Studio</strong>. Solo falta un paso:
        confirma tu dirección de email para activar tu cuenta.
      </p>

      <!-- CTA -->
      <div style="text-align:center;margin:36px 0;">
        <a href="${verifyUrl}"
           style="background:${brandColor};color:#ffffff;padding:15px 36px;
                  text-decoration:none;border-radius:6px;font-size:16px;font-weight:600;
                  display:inline-block;letter-spacing:0.3px;">
          Verificar mi email
        </a>
      </div>

      <p style="margin:0 0 8px;font-size:13px;color:#888;text-align:center;">
        Este enlace expira en <strong>24 horas</strong>.
      </p>

      <!-- Fallback URL -->
      <div style="background:#f9f6f2;border-radius:6px;padding:16px;margin-top:28px;">
        <p style="margin:0 0 6px;font-size:12px;color:#aaa;text-transform:uppercase;letter-spacing:1px;">
          ¿El botón no funciona?
        </p>
        <p style="margin:0;font-size:12px;color:#888;word-break:break-all;">
          Copia y pega este enlace en tu navegador:<br>
          <a href="${verifyUrl}" style="color:${brandColor};">${verifyUrl}</a>
        </p>
      </div>

      <p style="margin:28px 0 0;font-size:13px;color:#bbb;text-align:center;">
        Si no creaste esta cuenta, puedes ignorar este mensaje.
      </p>
    </div>

    <!-- Footer -->
    <p style="text-align:center;font-size:12px;color:#ccc;margin:24px 0 40px;">
      © ${new Date().getFullYear()} Weddly Studio · Todos los derechos reservados
    </p>

  </div>
</body>
</html>`.trim();
}

function buildCollaboratorInviteHtml(data: CollaboratorInviteEmailData): string {
  const roleLabel  = ROLE_LABELS[data.role] ?? data.role;
  const acceptUrl  = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/invites/accept/${data.token}`;
  const brandColor = '#8B6F47';

  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Invitación — ${data.weddingName}</title></head>
<body style="margin:0;padding:20px;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;">
    <div style="text-align:center;padding:40px 0 24px;">
      <h1 style="margin:0;font-size:28px;color:${brandColor};">Weddly</h1>
    </div>
    <div style="background:#fff;border-radius:10px;padding:48px 40px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
      <h2 style="margin:0 0 16px;font-size:22px;color:#222;">Te han invitado 🎉</h2>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#555;">
        <strong>${data.inviterName}</strong> te ha invitado a colaborar en la boda
        <strong>${data.weddingName}</strong> con el rol de <strong>${roleLabel}</strong>.
      </p>
      <div style="text-align:center;margin:36px 0;">
        <a href="${acceptUrl}"
           style="background:${brandColor};color:#fff;padding:15px 36px;
                  text-decoration:none;border-radius:6px;font-size:16px;font-weight:600;
                  display:inline-block;">
          Aceptar invitación
        </a>
      </div>
      <p style="margin:0 0 8px;font-size:13px;color:#888;text-align:center;">
        Este enlace expira en <strong>48 horas</strong>.
      </p>
      <div style="background:#f9f6f2;border-radius:6px;padding:16px;margin-top:28px;">
        <p style="margin:0 0 6px;font-size:12px;color:#aaa;text-transform:uppercase;letter-spacing:1px;">
          ¿El botón no funciona?
        </p>
        <p style="margin:0;font-size:12px;color:#888;word-break:break-all;">
          <a href="${acceptUrl}" style="color:${brandColor};">${acceptUrl}</a>
        </p>
      </div>
      <p style="margin:28px 0 0;font-size:13px;color:#bbb;text-align:center;">
        Si no esperabas esta invitación, puedes ignorar este mensaje.
      </p>
    </div>
    <p style="text-align:center;font-size:12px;color:#ccc;margin:24px 0 40px;">
      © ${new Date().getFullYear()} Weddly Studio
    </p>
  </div>
</body>
</html>`.trim();
}

function buildTfaResetHtml(data: TfaResetEmailData): string {
  const resetUrl   = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/auth/2fa-reset?token=${data.token}`;
  const brandColor = '#8B6F47';

  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Recuperar acceso 2FA — Weddly</title></head>
<body style="margin:0;padding:20px;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;">
    <div style="text-align:center;padding:40px 0 24px;">
      <h1 style="margin:0;font-size:28px;color:${brandColor};">Weddly</h1>
      <p style="margin:4px 0 0;font-size:13px;color:#aaa;letter-spacing:2px;text-transform:uppercase;">Studio</p>
    </div>
    <div style="background:#fff;border-radius:10px;padding:48px 40px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
      <h2 style="margin:0 0 16px;font-size:22px;color:#222;">Recuperar acceso 2FA 🔐</h2>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#555;">
        Hola <strong>${data.firstName}</strong>, recibimos una solicitud para desactivar la
        autenticación de doble factor en tu cuenta. Si fuiste tú, haz clic en el botón.
      </p>
      <div style="text-align:center;margin:36px 0;">
        <a href="${resetUrl}"
           style="background:#c0392b;color:#fff;padding:15px 36px;
                  text-decoration:none;border-radius:6px;font-size:16px;font-weight:600;
                  display:inline-block;">
          Desactivar mi 2FA
        </a>
      </div>
      <p style="margin:0 0 8px;font-size:13px;color:#888;text-align:center;">
        Este enlace expira en <strong>30 minutos</strong>.
      </p>
      <div style="background:#fff8f8;border:1px solid #f5c6c6;border-radius:6px;padding:16px;margin-top:28px;">
        <p style="margin:0;font-size:13px;color:#c0392b;">
          ⚠️ Si no solicitaste esto, ignora este email. Tu cuenta sigue protegida.
        </p>
      </div>
      <div style="background:#f9f6f2;border-radius:6px;padding:16px;margin-top:16px;">
        <p style="margin:0 0 6px;font-size:12px;color:#aaa;text-transform:uppercase;letter-spacing:1px;">¿El botón no funciona?</p>
        <p style="margin:0;font-size:12px;color:#888;word-break:break-all;">
          <a href="${resetUrl}" style="color:${brandColor};">${resetUrl}</a>
        </p>
      </div>
    </div>
    <p style="text-align:center;font-size:12px;color:#ccc;margin:24px 0 40px;">
      © ${new Date().getFullYear()} Weddly Studio
    </p>
  </div>
</body>
</html>`.trim();
}

// ─── Funciones de envío ──────────────────────────────────────────

export async function sendInvitationEmail(data: InvitationEmailData): Promise<SendResult> {
  try {
    await transporter.sendMail({
      from: `"${data.weddingName}" <${process.env.SMTP_USER}>`,
      to: data.to,
      subject: `Estás invitado/a — ${data.weddingName}`,
      html: buildInvitationHtml(data),
    });
    return { success: true };
  } catch (err: any) {
    console.error(`[Email] Error enviando invitación a ${data.to}:`, err.message);
    return { success: false, error: err.message };
  }
}

export async function sendVerificationEmail(data: VerificationEmailData): Promise<SendResult> {
  try {
    await transporter.sendMail({
      from: `"Weddly Studio" <${process.env.SMTP_USER}>`,
      to: data.to,
      subject: 'Verifica tu email — Weddly Studio',
      html: buildVerificationHtml(data),
    });
    return { success: true };
  } catch (err: any) {
    console.error(`[Email] Error enviando verificación a ${data.to}:`, err.message);
    return { success: false, error: err.message };
  }
}

export async function sendCollaboratorInviteEmail(
  data: CollaboratorInviteEmailData,
): Promise<SendResult> {
  try {
    await transporter.sendMail({
      from:    `"Weddly Studio" <${process.env.SMTP_USER}>`,
      to:      data.to,
      subject: `Te invitaron a colaborar en "${data.weddingName}" — Weddly`,
      html:    buildCollaboratorInviteHtml(data),
    });
    return { success: true };
  } catch (err: any) {
    console.error(`[Email] Error enviando invitación colaborador a ${data.to}:`, err.message);
    return { success: false, error: err.message };
  }
}

export async function sendTfaResetEmail(data: TfaResetEmailData): Promise<SendResult> {
  try {
    await transporter.sendMail({
      from:    `"Weddly Studio" <${process.env.SMTP_USER}>`,
      to:      data.to,
      subject: 'Recuperar acceso 2FA — Weddly Studio',
      html:    buildTfaResetHtml(data),
    });
    return { success: true };
  } catch (err: any) {
    console.error(`[Email] Error enviando reset 2FA a ${data.to}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Verifica que la conexión SMTP funciona al arrancar.
 */
export async function verifySmtpConnection(): Promise<void> {
  try {
    await transporter.verify();
    console.log('✅ SMTP conectado correctamente');
  } catch (err) {
    console.warn('⚠️  SMTP no disponible — los emails no se enviarán:', err);
  }
}