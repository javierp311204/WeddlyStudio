export type SupportedLang = 'es' | 'en' | 'fr' | 'ca';

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
  lang?: string;
}

export interface VerificationEmailData {
  to: string;
  firstName: string;
  verificationToken: string;
  lang?: string;
}

export interface CollaboratorInviteEmailData {
  to:          string;
  inviterName: string;
  weddingName: string;
  role:        string;
  token:       string;
  lang?:       string;
}

export interface TfaResetEmailData {
  to:        string;
  firstName: string;
  token:     string;
  lang?:     string;
}

export interface SendResult {
  success: boolean;
  error?: string;
}

export interface PasswordResetEmailData {
  to:        string;
  firstName: string;
  resetToken: string;
  lang?:     string;
}