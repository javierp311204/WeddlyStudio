import { Resend } from 'resend';
import {
  InvitationEmailData,
  VerificationEmailData,
  CollaboratorInviteEmailData,
  TfaResetEmailData,
  SendResult,
  PasswordResetEmailData,
} from './email.types';
import {
  getLang,
  ROLE_LABELS,
  verificationT,
  invitationT,
  collaboratorT,
  tfaResetT,
  passwordResetT,
} from './email.i18n';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM   = process.env.EMAIL_FROM || 'Weddly Studio <no-reply@weddlystudio.uk>';

const brandColor = '#8B6F47';

// ─── Helper de envío ─────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string, from = FROM): Promise<void> {
  const { error } = await resend.emails.send({ from, to, subject, html });
  if (error) throw new Error(error.message);
}

// ─── Templates HTML ──────────────────────────────────────────────

function buildVerificationHtml(data: VerificationEmailData): string {
  const lang = getLang(data.lang);
  const t    = verificationT[lang];
  const url  = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email/${data.verificationToken}`;

  return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.subject}</title>
</head>
<body style="margin:0;padding:20px;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;">
    <div style="text-align:center;padding:40px 0 24px;">
      <h1 style="margin:0;font-size:28px;color:${brandColor};letter-spacing:1px;">Weddly</h1>
      <p style="margin:4px 0 0;font-size:13px;color:#aaa;letter-spacing:2px;text-transform:uppercase;">Studio</p>
    </div>
    <div style="background:#ffffff;border-radius:10px;padding:48px 40px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
      <h2 style="margin:0 0 16px;font-size:22px;color:#222;font-weight:600;">${t.greeting(data.firstName)}</h2>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#555;">${t.body}</p>
      <div style="text-align:center;margin:36px 0;">
        <a href="${url}" style="background:${brandColor};color:#ffffff;padding:15px 36px;text-decoration:none;border-radius:6px;font-size:16px;font-weight:600;display:inline-block;">
          ${t.cta}
        </a>
      </div>
      <p style="margin:0 0 8px;font-size:13px;color:#888;text-align:center;">${t.expiry}</p>
      <div style="background:#f9f6f2;border-radius:6px;padding:16px;margin-top:28px;">
        <p style="margin:0 0 6px;font-size:12px;color:#aaa;text-transform:uppercase;letter-spacing:1px;">${t.fallback}</p>
        <p style="margin:0;font-size:12px;color:#888;word-break:break-all;">
          ${t.fallback2}<br>
          <a href="${url}" style="color:${brandColor};">${url}</a>
        </p>
      </div>
      <p style="margin:28px 0 0;font-size:13px;color:#bbb;text-align:center;">${t.ignore}</p>
    </div>
    <p style="text-align:center;font-size:12px;color:#ccc;margin:24px 0 40px;">
      © ${new Date().getFullYear()} Weddly Studio
    </p>
  </div>
</body>
</html>`.trim();
}

function buildInvitationHtml(data: InvitationEmailData): string {
  const lang = getLang(data.lang);
  const t    = invitationT[lang];
  const url  = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/rsvp/${data.rsvpCode}`;

  const formattedDate = data.weddingDate.toLocaleDateString(
    lang === 'en' ? 'en-GB' : lang === 'fr' ? 'fr-FR' : lang === 'ca' ? 'ca-ES' : 'es-ES',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  );

  const styles: Record<InvitationEmailData['template'], string> = {
    elegant:    `font-family:'Georgia',serif;background:#fdf8f3;border:2px solid ${data.primaryColor};`,
    modern:     `font-family:'Helvetica Neue',sans-serif;background:#ffffff;border-left:6px solid ${data.primaryColor};`,
    rustic:     `font-family:'Palatino Linotype',serif;background:#f5ede0;border:3px solid ${data.secondaryColor};`,
    minimalist: `font-family:'Arial',sans-serif;background:#ffffff;border-top:3px solid ${data.primaryColor};`,
  };

  return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>${data.weddingName}</title>
</head>
<body style="margin:0;padding:20px;background:#f0f0f0;">
  <div style="max-width:600px;margin:0 auto;padding:40px;${styles[data.template]}border-radius:8px;">
    <h1 style="color:${data.primaryColor};text-align:center;margin-bottom:8px;">${data.weddingName}</h1>
    <p style="text-align:center;color:#888;margin-bottom:32px;font-size:14px;">
      ${formattedDate}${data.locationName ? ` · ${data.locationName}` : ''}
    </p>
    <p style="font-size:16px;margin-bottom:8px;">${t.dear(data.guestName)}</p>
    <p style="font-size:15px;line-height:1.7;color:#444;margin-bottom:24px;">
      ${data.customText ?? t.body}
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${url}" style="background:${data.primaryColor};color:#fff;padding:14px 32px;text-decoration:none;border-radius:4px;font-size:16px;font-weight:bold;display:inline-block;">
        ${t.cta}
      </a>
    </div>
    <p style="text-align:center;font-size:12px;color:#aaa;margin-top:32px;">
      ${t.code} <strong>${data.rsvpCode}</strong><br>
      <a href="${url}" style="color:${data.primaryColor};">${url}</a>
    </p>
  </div>
</body>
</html>`.trim();
}

function buildCollaboratorInviteHtml(data: CollaboratorInviteEmailData): string {
  const lang      = getLang(data.lang);
  const t         = collaboratorT[lang];
  const roleLabel = ROLE_LABELS[lang][data.role] ?? data.role;
  const url       = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/invites/accept/${data.token}`;

  return `
<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="UTF-8"><title>${t.title}</title></head>
<body style="margin:0;padding:20px;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;">
    <div style="text-align:center;padding:40px 0 24px;">
      <h1 style="margin:0;font-size:28px;color:${brandColor};">Weddly</h1>
    </div>
    <div style="background:#fff;border-radius:10px;padding:48px 40px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
      <h2 style="margin:0 0 16px;font-size:22px;color:#222;">${t.title}</h2>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#555;">
        ${t.body(data.inviterName, data.weddingName, roleLabel)}
      </p>
      <div style="text-align:center;margin:36px 0;">
        <a href="${url}" style="background:${brandColor};color:#fff;padding:15px 36px;text-decoration:none;border-radius:6px;font-size:16px;font-weight:600;display:inline-block;">
          ${t.cta}
        </a>
      </div>
      <p style="margin:0 0 8px;font-size:13px;color:#888;text-align:center;">${t.expiry}</p>
      <div style="background:#f9f6f2;border-radius:6px;padding:16px;margin-top:28px;">
        <p style="margin:0 0 6px;font-size:12px;color:#aaa;text-transform:uppercase;letter-spacing:1px;">${t.fallback}</p>
        <p style="margin:0;font-size:12px;color:#888;word-break:break-all;">
          <a href="${url}" style="color:${brandColor};">${url}</a>
        </p>
      </div>
      <p style="margin:28px 0 0;font-size:13px;color:#bbb;text-align:center;">${t.ignore}</p>
    </div>
    <p style="text-align:center;font-size:12px;color:#ccc;margin:24px 0 40px;">
      © ${new Date().getFullYear()} Weddly Studio
    </p>
  </div>
</body>
</html>`.trim();
}

function buildTfaResetHtml(data: TfaResetEmailData): string {
  const lang = getLang(data.lang);
  const t    = tfaResetT[lang];
  const url  = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/auth/2fa-reset?token=${data.token}`;

  return `
<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="UTF-8"><title>${t.subject}</title></head>
<body style="margin:0;padding:20px;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;">
    <div style="text-align:center;padding:40px 0 24px;">
      <h1 style="margin:0;font-size:28px;color:${brandColor};">Weddly</h1>
      <p style="margin:4px 0 0;font-size:13px;color:#aaa;letter-spacing:2px;text-transform:uppercase;">Studio</p>
    </div>
    <div style="background:#fff;border-radius:10px;padding:48px 40px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
      <h2 style="margin:0 0 16px;font-size:22px;color:#222;">${t.title}</h2>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#555;">${t.body(data.firstName)}</p>
      <div style="text-align:center;margin:36px 0;">
        <a href="${url}" style="background:#c0392b;color:#fff;padding:15px 36px;text-decoration:none;border-radius:6px;font-size:16px;font-weight:600;display:inline-block;">
          ${t.cta}
        </a>
      </div>
      <p style="margin:0 0 8px;font-size:13px;color:#888;text-align:center;">${t.expiry}</p>
      <div style="background:#fff8f8;border:1px solid #f5c6c6;border-radius:6px;padding:16px;margin-top:28px;">
        <p style="margin:0;font-size:13px;color:#c0392b;">${t.warning}</p>
      </div>
      <div style="background:#f9f6f2;border-radius:6px;padding:16px;margin-top:16px;">
        <p style="margin:0 0 6px;font-size:12px;color:#aaa;text-transform:uppercase;letter-spacing:1px;">${t.fallback}</p>
        <p style="margin:0;font-size:12px;color:#888;word-break:break-all;">
          <a href="${url}" style="color:${brandColor};">${url}</a>
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

function buildPasswordResetHtml(data: PasswordResetEmailData): string {
  const lang = getLang(data.lang);
  const t    = passwordResetT[lang];
  const url  = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/reset-pass?token=${data.resetToken}`;

  return `
<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="UTF-8"><title>${t.subject}</title></head>
<body style="margin:0;padding:20px;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;">
    <div style="text-align:center;padding:40px 0 24px;">
      <h1 style="margin:0;font-size:28px;color:${brandColor};letter-spacing:1px;">Weddly</h1>
      <p style="margin:4px 0 0;font-size:13px;color:#aaa;letter-spacing:2px;text-transform:uppercase;">Studio</p>
    </div>
    <div style="background:#fff;border-radius:10px;padding:48px 40px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
      <h2 style="margin:0 0 16px;font-size:22px;color:#222;">${t.title}</h2>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#555;">${t.body(data.firstName)}</p>
      <div style="text-align:center;margin:36px 0;">
        <a href="${url}" style="background:${brandColor};color:#fff;padding:15px 36px;text-decoration:none;border-radius:6px;font-size:16px;font-weight:600;display:inline-block;">
          ${t.cta}
        </a>
      </div>
      <p style="margin:0 0 8px;font-size:13px;color:#888;text-align:center;">${t.expiry}</p>
      <div style="background:#fff8f0;border:1px solid #f5dfc6;border-radius:6px;padding:16px;margin-top:28px;">
        <p style="margin:0;font-size:13px;color:#a05a1a;">${t.warning}</p>
      </div>
      <div style="background:#f9f6f2;border-radius:6px;padding:16px;margin-top:16px;">
        <p style="margin:0 0 6px;font-size:12px;color:#aaa;text-transform:uppercase;letter-spacing:1px;">${t.fallback}</p>
        <p style="margin:0;font-size:12px;color:#888;word-break:break-all;">
          <a href="${url}" style="color:${brandColor};">${url}</a>
        </p>
      </div>
      <p style="margin:28px 0 0;font-size:13px;color:#bbb;text-align:center;">${t.ignore}</p>
    </div>
    <p style="text-align:center;font-size:12px;color:#ccc;margin:24px 0 40px;">
      © ${new Date().getFullYear()} Weddly Studio
    </p>
  </div>
</body>
</html>`.trim();
}

// ─── Funciones de envío ──────────────────────────────────────────

export async function sendVerificationEmail(data: VerificationEmailData): Promise<SendResult> {
  const lang = getLang(data.lang);
  try {
    await sendEmail(data.to, verificationT[lang].subject, buildVerificationHtml(data));
    return { success: true };
  } catch (err: any) {
    console.error(`[Email] Error enviando verificación a ${data.to}:`, err.message);
    return { success: false, error: err.message };
  }
}

export async function sendInvitationEmail(data: InvitationEmailData): Promise<SendResult> {
  const lang = getLang(data.lang);
  try {
    await sendEmail(
      data.to,
      invitationT[lang].subject(data.weddingName),
      buildInvitationHtml(data),
      `"${data.weddingName}" <no-reply@weddlystudio.uk>`,
    );
    return { success: true };
  } catch (err: any) {
    console.error(`[Email] Error enviando invitación a ${data.to}:`, err.message);
    return { success: false, error: err.message };
  }
}

export async function sendCollaboratorInviteEmail(data: CollaboratorInviteEmailData): Promise<SendResult> {
  const lang = getLang(data.lang);
  try {
    await sendEmail(data.to, collaboratorT[lang].subject(data.weddingName), buildCollaboratorInviteHtml(data));
    return { success: true };
  } catch (err: any) {
    console.error(`[Email] Error enviando invitación colaborador a ${data.to}:`, err.message);
    return { success: false, error: err.message };
  }
}

export async function sendTfaResetEmail(data: TfaResetEmailData): Promise<SendResult> {
  const lang = getLang(data.lang);
  try {
    await sendEmail(data.to, tfaResetT[lang].subject, buildTfaResetHtml(data));
    return { success: true };
  } catch (err: any) {
    console.error(`[Email] Error enviando reset 2FA a ${data.to}:`, err.message);
    return { success: false, error: err.message };
  }
}

export async function sendPasswordResetEmail(data: PasswordResetEmailData): Promise<SendResult> {
  const lang = getLang(data.lang);
  try {
    await sendEmail(data.to, passwordResetT[lang].subject, buildPasswordResetHtml(data));
    return { success: true };
  } catch (err: any) {
    console.error(`[Email] Error enviando reset password a ${data.to}:`, err.message);
    return { success: false, error: err.message };
  }
}

export async function verifySmtpConnection(): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️  RESEND_API_KEY no configurada — los emails no se enviarán');
    return;
  }
  console.log('✅ Resend configurado correctamente');
}