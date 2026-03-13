import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { NotificationService } from '../../services/notification/notification.service';
import { AuthService } from '../../services/auth/auth.service';
import { Perfil2faComponent } from '../perfil2fa/perfil2fa.component';
import { IconComponent } from '../../shared/icons/icon.component';

interface FormErrors {
  first_name?: string;
  last_name?:  string;
  email?:      string;
  phone?:      string;
}

interface PasswordErrors {
  current?: string;
  new?:     string;
  confirm?: string;
}

@Component({
  selector: 'app-perfil-usuario',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule, HttpClientModule, Perfil2faComponent, IconComponent],
  templateUrl: './perfil-usuario.component.html',
  styleUrl: './perfil-usuario.component.css',
})
export class PerfilUsuarioComponent implements OnInit {

  editMode          = false;
  guardando         = false;
  guardandoPassword = false;
  showPasswordModal = false;
  avatarPreview: string | null = null;
  avatarFile: File | null = null;

  user: any = {};

  form = {
    first_name: '',
    last_name:  '',
    nickname:   '',
    email:      '',
    phone:      '',
    gender:     '',
    language:   'es',
  };

  errors: FormErrors = {};
  passwordErrors: PasswordErrors = {};
  passwordForm = { current: '', new: '', confirm: '' };

  private authUrl  = 'http://localhost:3000/api/auth';
  private usersUrl = 'http://localhost:3000/api/users';

  constructor(
    private http: HttpClient,
    private notifService: NotificationService,
    private authService: AuthService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.cargarPerfil();
  }

  private getHeaders() {
    const token = localStorage.getItem('token');
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  cargarPerfil() {
    this.http.get<any>(`${this.authUrl}/me`, this.getHeaders()).subscribe({
      next: (res) => {
        this.user = res?.data ?? res;
        if (this.user.avatar_url) {
          this.authService.updateAvatar(this.user.avatar_url);
        }
        this.resetForm();
      },
      error: () => {
        this.notifService.showError(
          this.translate.instant('COMMON.ERROR'),
          this.translate.instant('PROFILE.LOAD_ERROR'),
        );
      },
    });
  }

  guardar() {
    if (!this.validarForm()) return;
    this.guardando = true;

    const emailCambiado = this.form.email !== this.user.email;

    const payload: any = {
      first_name: this.form.first_name.trim(),
      last_name:  this.form.last_name.trim(),
      nickname:   this.form.nickname.trim() || null,
      phone:      this.form.phone.trim()    || null,
      gender:     this.form.gender          || null,
      language:   this.form.language,
    };

    if (emailCambiado) payload.email = this.form.email.trim();

    this.http.patch<any>(`${this.authUrl}/me`, payload, this.getHeaders()).subscribe({
      next: (res) => {
        this.user      = res?.data ?? { ...this.user, ...payload };
        this.guardando = false;
        this.editMode  = false;
        this.errors    = {};

        const msg = emailCambiado
          ? this.translate.instant('PROFILE.SAVE_SUCCESS_EMAIL')
          : this.translate.instant('PROFILE.SAVE_SUCCESS');

        this.notifService.showSuccess(this.translate.instant('COMMON.SUCCESS'), msg);

        if (this.form.language !== this.user.language) {
          this.translate.use(this.form.language);
          localStorage.setItem('lang', this.form.language);
        }
      },
      error: (err) => {
        this.guardando = false;
        const msg = err?.error?.message || this.translate.instant('NOTIFICATIONS.ERROR_SAVING');
        this.notifService.showError(this.translate.instant('COMMON.ERROR'), msg);
      },
    });
  }

  onAvatarChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];

    if (!file.type.startsWith('image/')) {
      this.notifService.showError('Error', this.translate.instant('PROFILE.AVATAR_TYPE_ERROR'));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.notifService.showError('Error', this.translate.instant('PROFILE.AVATAR_SIZE_ERROR'));
      return;
    }

    this.avatarFile = file;
    const reader = new FileReader();
    reader.onload = (e) => this.avatarPreview = e.target?.result as string;
    reader.readAsDataURL(file);
    this.subirAvatar(file);
  }

  private subirAvatar(file: File) {
    const formData = new FormData();
    formData.append('avatar', file);
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.post<any>(`${this.usersUrl}/me/avatar`, formData, { headers }).subscribe({
      next: (res) => {
        const newAvatarUrl = res?.data?.avatar_url ?? this.avatarPreview;
        this.user.avatar_url = newAvatarUrl;
        this.avatarPreview = newAvatarUrl;

        if (typeof (this.authService as any).updateAvatar === 'function') {
          (this.authService as any).updateAvatar(newAvatarUrl);
        }

        this.notifService.showSuccess(
          this.translate.instant('COMMON.SUCCESS'),
          this.translate.instant('PROFILE.AVATAR_SUCCESS'),
        );
      },
      error: () => {
        this.notifService.showError('Error', this.translate.instant('PROFILE.AVATAR_ERROR'));
        this.avatarPreview = this.user.avatar_url || null;
      },
    });
  }

  resendVerification() {
    this.http.post<any>(`${this.authUrl}/resend-verification`, { email: this.user.email }, this.getHeaders()).subscribe({
      next: () => this.notifService.showSuccess(
        this.translate.instant('COMMON.SUCCESS'),
        this.translate.instant('PROFILE.VERIFICATION_SENT'),
      ),
      error: () => this.notifService.showError('Error', this.translate.instant('PROFILE.VERIFICATION_ERROR')),
    });
  }

  cambiarPassword() {
    if (!this.validarPassword()) return;
    this.guardandoPassword = true;

    this.http.patch<any>(
      `${this.authUrl}/change-password`,
      { current_password: this.passwordForm.current, new_password: this.passwordForm.new },
      this.getHeaders(),
    ).subscribe({
      next: () => {
        this.guardandoPassword = false;
        this.cerrarPasswordModal();
        this.notifService.showSuccess(
          this.translate.instant('COMMON.SUCCESS'),
          this.translate.instant('PROFILE.PASSWORD_SUCCESS'),
        );
      },
      error: (err) => {
        this.guardandoPassword = false;
        const msg = err?.error?.message || this.translate.instant('PROFILE.PASSWORD_ERROR');
        this.passwordErrors.current = msg;
      },
    });
  }

  confirmarEliminarCuenta() {
    this.notifService.askConfirmation(
      this.translate.instant('PROFILE.DELETE_ACCOUNT_CONFIRM'),
      this.translate.instant('PROFILE.DELETE_ACCOUNT_DESC'),
      'delete',
    ).then((confirmed) => {
      if (!confirmed) return;
      this.http.delete<any>(`${this.usersUrl}/me`, this.getHeaders()).subscribe({
        next: () => this.authService.logout(),
        error: () => this.notifService.showError('Error', this.translate.instant('PROFILE.DELETE_ERROR')),
      });
    });
  }

  private validarForm(): boolean {
    this.errors = {};
    if (!this.form.first_name.trim()) this.errors.first_name = this.translate.instant('PROFILE.REQUIRED');
    if (!this.form.last_name.trim())  this.errors.last_name  = this.translate.instant('PROFILE.REQUIRED');
    if (!this.form.email.trim()) {
      this.errors.email = this.translate.instant('PROFILE.REQUIRED');
    } else if (!this.isValidEmail(this.form.email)) {
      this.errors.email = this.translate.instant('PROFILE.EMAIL_INVALID');
    }
    if (this.form.phone && !this.isValidPhone(this.form.phone)) {
      this.errors.phone = this.translate.instant('PROFILE.PHONE_INVALID');
    }
    return !this.errors.first_name && !this.errors.last_name &&
           !this.errors.email      && !this.errors.phone;
  }

  private validarPassword(): boolean {
    this.passwordErrors = {};
    if (!this.passwordForm.current) this.passwordErrors.current = this.translate.instant('PROFILE.REQUIRED');
    if (!this.passwordForm.new) {
      this.passwordErrors.new = this.translate.instant('PROFILE.REQUIRED');
    } else if (this.passwordForm.new.length < 8) {
      this.passwordErrors.new = this.translate.instant('PROFILE.PASSWORD_MIN');
    }
    if (this.passwordForm.new !== this.passwordForm.confirm)
      this.passwordErrors.confirm = this.translate.instant('PROFILE.PASSWORD_MISMATCH');
    return !this.passwordErrors.current && !this.passwordErrors.new && !this.passwordErrors.confirm;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private isValidPhone(phone: string): boolean {
    return /^[\+\d\s\-\(\)]{7,30}$/.test(phone);
  }

  toggleEdit() {
    if (this.editMode) { this.resetForm(); this.errors = {}; }
    this.editMode = !this.editMode;
  }

  resetForm() {
    this.form = {
      first_name: this.user.first_name || '',
      last_name:  this.user.last_name  || '',
      nickname:   this.user.nickname   || '',
      email:      this.user.email      || '',
      phone:      this.user.phone      || '',
      gender:     this.user.gender     || '',
      language:   this.user.language   || 'es',
    };
    this.avatarPreview = this.user.avatar_url || null;
  }

  abrirCambioPassword() {
    this.passwordForm   = { current: '', new: '', confirm: '' };
    this.passwordErrors = {};
    this.showPasswordModal = true;
    document.body.style.overflow = 'hidden';
  }

  cerrarPasswordModal() {
    this.showPasswordModal = false;
    document.body.style.overflow = '';
  }

  getInitials(): string {
    const f = (this.user.first_name || '').charAt(0).toUpperCase();
    const l = (this.user.last_name  || '').charAt(0).toUpperCase();
    return (f + l) || '?';
  }

  getFullName(): string {
    return `${this.user.first_name || ''} ${this.user.last_name || ''}`.trim() || '—';
  }

  getRoleLabel(role: string): string {
    const map: Record<string, string> = {
      user: 'Usuario', admin: 'Administrador', superadmin: 'Super Admin',
    };
    return map[role] || role;
  }

  getGenderLabel(gender: string): string {
    const map: Record<string, string> = {
      male: 'Hombre', female: 'Mujer', non_binary: 'No binario', prefer_not: 'Prefiero no indicar',
    };
    return map[gender] || '';
  }

  getLanguageLabel(lang: string): string {
    const map: Record<string, string> = {
      es: '🇪🇸 Español', en: '🇬🇧 English', ca: '🏴 Català', fr: '🇫🇷 Français',
    };
    return map[lang] || lang;
  }

  getPlanLabel(): string {
    const planLabels: Record<string, string> = {
      free: 'Free', one_time: 'Evento PRO', subscription: 'Premium',
    };
    const weddingId = localStorage.getItem('weddingId');
    const roles: any[] = this.user.wedding_roles ?? [];
    if (roles.length > 0) {
      const activeRole = weddingId
        ? roles.find((r: any) => r.wedding?.id === weddingId)
        : roles[0];
      const planType = activeRole?.wedding?.plan_type;
      if (planType && planLabels[planType]) return planLabels[planType];
    }
    return planLabels['free'];
  }
}