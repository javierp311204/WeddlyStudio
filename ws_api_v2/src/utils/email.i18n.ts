import { SupportedLang } from './email.types';

export function getLang(lang?: string): SupportedLang {
  const supported: SupportedLang[] = ['es', 'en', 'fr', 'ca'];
  return supported.includes(lang as SupportedLang) ? (lang as SupportedLang) : 'es';
}

// ─── Roles ───────────────────────────────────────────────────────

export const ROLE_LABELS: Record<SupportedLang, Record<string, string>> = {
  es: { co_organizer: 'Co-organizador',  planner: 'Wedding Planner', guest: 'Invitado'  },
  en: { co_organizer: 'Co-organizer',    planner: 'Wedding Planner', guest: 'Guest'     },
  fr: { co_organizer: 'Co-organisateur', planner: 'Wedding Planner', guest: 'Invité'    },
  ca: { co_organizer: 'Co-organitzador', planner: 'Wedding Planner', guest: 'Convidat'  },
};

// ─── Verificación ─────────────────────────────────────────────────

export const verificationT: Record<SupportedLang, {
  subject:   string;
  greeting:  (name: string) => string;
  body:      string;
  cta:       string;
  expiry:    string;
  fallback:  string;
  fallback2: string;
  ignore:    string;
}> = {
  es: {
    subject:   'Verifica tu email — Weddly Studio',
    greeting:  (n) => `Hola, ${n} 👋`,
    body:      'Gracias por unirte a <strong>Weddly Studio</strong>. Solo falta un paso: confirma tu dirección de email para activar tu cuenta.',
    cta:       'Verificar mi email',
    expiry:    'Este enlace expira en <strong>24 horas</strong>.',
    fallback:  '¿El botón no funciona?',
    fallback2: 'Copia y pega este enlace en tu navegador:',
    ignore:    'Si no creaste esta cuenta, puedes ignorar este mensaje.',
  },
  en: {
    subject:   'Verify your email — Weddly Studio',
    greeting:  (n) => `Hi, ${n} 👋`,
    body:      'Thanks for joining <strong>Weddly Studio</strong>. One more step: confirm your email address to activate your account.',
    cta:       'Verify my email',
    expiry:    'This link expires in <strong>24 hours</strong>.',
    fallback:  'Button not working?',
    fallback2: 'Copy and paste this link into your browser:',
    ignore:    'If you didn\'t create this account, you can ignore this message.',
  },
  fr: {
    subject:   'Vérifiez votre email — Weddly Studio',
    greeting:  (n) => `Bonjour, ${n} 👋`,
    body:      'Merci de rejoindre <strong>Weddly Studio</strong>. Une dernière étape : confirmez votre adresse email pour activer votre compte.',
    cta:       'Vérifier mon email',
    expiry:    'Ce lien expire dans <strong>24 heures</strong>.',
    fallback:  'Le bouton ne fonctionne pas ?',
    fallback2: 'Copiez et collez ce lien dans votre navigateur :',
    ignore:    'Si vous n\'avez pas créé ce compte, vous pouvez ignorer ce message.',
  },
  ca: {
    subject:   'Verifica el teu email — Weddly Studio',
    greeting:  (n) => `Hola, ${n} 👋`,
    body:      'Gràcies per unir-te a <strong>Weddly Studio</strong>. Només falta un pas: confirma la teva adreça de correu per activar el compte.',
    cta:       'Verificar el meu email',
    expiry:    'Aquest enllaç caduca en <strong>24 hores</strong>.',
    fallback:  'El botó no funciona?',
    fallback2: 'Copia i enganxa aquest enllaç al teu navegador:',
    ignore:    'Si no has creat aquest compte, pots ignorar aquest missatge.',
  },
};

// ─── Invitación RSVP ──────────────────────────────────────────────

export const invitationT: Record<SupportedLang, {
  subject:   (weddingName: string) => string;
  dear:      (guestName: string) => string;
  body:      string;
  cta:       string;
  code:      string;
}> = {
  es: {
    subject:  (n) => `Estás invitado/a — ${n}`,
    dear:     (n) => `Querido/a <strong>${n}</strong>,`,
    body:     'Tenemos el placer de invitarte a celebrar con nosotros el día más especial de nuestras vidas. Tu presencia sería un honor y una alegría.',
    cta:      'Confirmar asistencia',
    code:     'O accede con tu código personal:',
  },
  en: {
    subject:  (n) => `You're invited — ${n}`,
    dear:     (n) => `Dear <strong>${n}</strong>,`,
    body:     'We are delighted to invite you to celebrate the most special day of our lives with us. Your presence would be an honor and a joy.',
    cta:      'Confirm attendance',
    code:     'Or use your personal code:',
  },
  fr: {
    subject:  (n) => `Vous êtes invité(e) — ${n}`,
    dear:     (n) => `Cher/Chère <strong>${n}</strong>,`,
    body:     'Nous avons le plaisir de vous inviter à célébrer avec nous le jour le plus spécial de notre vie. Votre présence serait un honneur et une joie.',
    cta:      'Confirmer ma présence',
    code:     'Ou accédez avec votre code personnel :',
  },
  ca: {
    subject:  (n) => `Estàs convidat/da — ${n}`,
    dear:     (n) => `Estimat/da <strong>${n}</strong>,`,
    body:     'Tenim el plaer de convidar-te a celebrar amb nosaltres el dia més especial de les nostres vides. La teva presència seria un honor i una alegria.',
    cta:      'Confirmar assistència',
    code:     'O accedeix amb el teu codi personal:',
  },
};

// ─── Colaborador ─────────────────────────────────────────────────

export const collaboratorT: Record<SupportedLang, {
  subject:  (weddingName: string) => string;
  title:    string;
  body:     (inviter: string, wedding: string, role: string) => string;
  cta:      string;
  expiry:   string;
  fallback: string;
  ignore:   string;
}> = {
  es: {
    subject:  (n) => `Te invitaron a colaborar en "${n}" — Weddly`,
    title:    'Te han invitado 🎉',
    body:     (i, w, r) => `<strong>${i}</strong> te ha invitado a colaborar en la boda <strong>${w}</strong> con el rol de <strong>${r}</strong>.`,
    cta:      'Aceptar invitación',
    expiry:   'Este enlace expira en <strong>48 horas</strong>.',
    fallback: '¿El botón no funciona?',
    ignore:   'Si no esperabas esta invitación, puedes ignorar este mensaje.',
  },
  en: {
    subject:  (n) => `You've been invited to collaborate on "${n}" — Weddly`,
    title:    'You\'ve been invited 🎉',
    body:     (i, w, r) => `<strong>${i}</strong> has invited you to collaborate on the wedding <strong>${w}</strong> as <strong>${r}</strong>.`,
    cta:      'Accept invitation',
    expiry:   'This link expires in <strong>48 hours</strong>.',
    fallback: 'Button not working?',
    ignore:   'If you weren\'t expecting this invitation, you can ignore this message.',
  },
  fr: {
    subject:  (n) => `Vous avez été invité(e) à collaborer sur "${n}" — Weddly`,
    title:    'Vous avez été invité(e) 🎉',
    body:     (i, w, r) => `<strong>${i}</strong> vous a invité(e) à collaborer sur le mariage <strong>${w}</strong> en tant que <strong>${r}</strong>.`,
    cta:      'Accepter l\'invitation',
    expiry:   'Ce lien expire dans <strong>48 heures</strong>.',
    fallback: 'Le bouton ne fonctionne pas ?',
    ignore:   'Si vous n\'attendiez pas cette invitation, vous pouvez ignorer ce message.',
  },
  ca: {
    subject:  (n) => `T'han convidat a col·laborar a "${n}" — Weddly`,
    title:    'T\'han convidat 🎉',
    body:     (i, w, r) => `<strong>${i}</strong> t'ha convidat a col·laborar al casament <strong>${w}</strong> amb el rol de <strong>${r}</strong>.`,
    cta:      'Acceptar la invitació',
    expiry:   'Aquest enllaç caduca en <strong>48 hores</strong>.',
    fallback: 'El botó no funciona?',
    ignore:   'Si no esperaves aquesta invitació, pots ignorar aquest missatge.',
  },
};

// ─── Reset 2FA ───────────────────────────────────────────────────

export const tfaResetT: Record<SupportedLang, {
  subject:  string;
  title:    string;
  body:     (firstName: string) => string;
  cta:      string;
  expiry:   string;
  warning:  string;
  fallback: string;
}> = {
  es: {
    subject:  'Recuperar acceso 2FA — Weddly Studio',
    title:    'Recuperar acceso 2FA 🔐',
    body:     (n) => `Hola <strong>${n}</strong>, recibimos una solicitud para desactivar la autenticación de doble factor en tu cuenta. Si fuiste tú, haz clic en el botón.`,
    cta:      'Desactivar mi 2FA',
    expiry:   'Este enlace expira en <strong>30 minutos</strong>.',
    warning:  '⚠️ Si no solicitaste esto, ignora este email. Tu cuenta sigue protegida.',
    fallback: '¿El botón no funciona?',
  },
  en: {
    subject:  'Recover 2FA access — Weddly Studio',
    title:    'Recover 2FA access 🔐',
    body:     (n) => `Hi <strong>${n}</strong>, we received a request to disable two-factor authentication on your account. If that was you, click the button below.`,
    cta:      'Disable my 2FA',
    expiry:   'This link expires in <strong>30 minutes</strong>.',
    warning:  '⚠️ If you didn\'t request this, ignore this email. Your account is still protected.',
    fallback: 'Button not working?',
  },
  fr: {
    subject:  'Récupérer l\'accès 2FA — Weddly Studio',
    title:    'Récupérer l\'accès 2FA 🔐',
    body:     (n) => `Bonjour <strong>${n}</strong>, nous avons reçu une demande de désactivation de la double authentification sur votre compte. Si c'était vous, cliquez sur le bouton.`,
    cta:      'Désactiver mon 2FA',
    expiry:   'Ce lien expire dans <strong>30 minutes</strong>.',
    warning:  '⚠️ Si vous n\'avez pas fait cette demande, ignorez cet email. Votre compte est toujours protégé.',
    fallback: 'Le bouton ne fonctionne pas ?',
  },
  ca: {
    subject:  'Recuperar accés 2FA — Weddly Studio',
    title:    'Recuperar accés 2FA 🔐',
    body:     (n) => `Hola <strong>${n}</strong>, hem rebut una sol·licitud per desactivar la doble autenticació del teu compte. Si has estat tu, fes clic al botó.`,
    cta:      'Desactivar el meu 2FA',
    expiry:   'Aquest enllaç caduca en <strong>30 minuts</strong>.',
    warning:  '⚠️ Si no has sol·licitat això, ignora aquest email. El teu compte segueix protegit.',
    fallback: 'El botó no funciona?',
  },
};