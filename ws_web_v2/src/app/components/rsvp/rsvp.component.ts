import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IconComponent } from '../../shared/icons/icon.component';

type RsvpState = 'loading' | 'form' | 'success' | 'error';

@Component({
  selector: 'app-rsvp',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, TranslateModule, IconComponent],
  template: `
    <div class="rsvp-page">

      <!-- Fondo decorativo -->
      <div class="bg-decoration">
        <div class="petal p1"></div>
        <div class="petal p2"></div>
        <div class="petal p3"></div>
        <div class="petal p4"></div>
      </div>

      <div class="rsvp-container">

        <!-- Logo / Marca -->
        <div class="brand">
          <span class="brand-script">Weddly</span>
        </div>

        <!-- LOADING -->
        <div *ngIf="state === 'loading'" class="state-card loading-card">
          <div class="spinner">
            <div class="ring"></div>
          </div>
          <p class="loading-text">{{ 'RSVP.LOADING' | translate }}</p>
        </div>

        <!-- ERROR -->
        <div *ngIf="state === 'error'" class="state-card error-card">
          <div class="icon-circle error-icon">✕</div>
          <h2>{{ 'RSVP.INVALID_CODE' | translate }}</h2>
          <p>{{ errorMsg }}</p>
          <button class="btn-home" (click)="goHome()">{{ 'RSVP.GO_HOME' | translate }}</button>
        </div>

        <!-- SUCCESS -->
        <div *ngIf="state === 'success'" class="state-card success-card">
          <div class="icon-circle success-icon">
            <span *ngIf="confirmedStatus === 'confirmed'"><app-icon name="dressCode" [size]="30"></app-icon></span>
            <span *ngIf="confirmedStatus === 'declined'"><app-icon name="dressCode" [size]="30"></app-icon></span>
          </div>
          <h2 *ngIf="confirmedStatus === 'confirmed'">{{ 'RSVP.SEE_YOU_SOON' | translate }}</h2>
          <h2 *ngIf="confirmedStatus === 'declined'">{{ 'RSVP.RESPONSE_REGISTERED' | translate }}</h2>
          <p *ngIf="confirmedStatus === 'confirmed'" class="success-msg"
             [innerHTML]="'RSVP.CONFIRMED_MSG' | translate:{ name: guestData?.wedding?.name }">
          </p>
          <p *ngIf="confirmedStatus === 'declined'" class="success-msg">
            {{ 'RSVP.DECLINED_MSG' | translate }}
          </p>
          <div class="wedding-pill" *ngIf="guestData?.wedding">
            <span class="pill-date">{{ guestData.wedding.wedding_date | date:'d MMM yyyy' }}</span>
          </div>
        </div>

        <!-- FORM -->
        <div *ngIf="state === 'form'" class="form-card">

          <!-- Cabecera personal -->
          <div class="form-header">
            <div class="guest-avatar">{{ getInitial() }}</div>
            <div class="guest-info">
              <p class="guest-label">{{ 'RSVP.INVITATION_FOR' | translate }}</p>
              <h1 class="guest-name">{{ guestData?.first_name }} {{ guestData?.last_name }}</h1>
            </div>
          </div>

          <!-- Datos de la boda -->
          <div class="wedding-info" *ngIf="guestData?.wedding">
            <div class="wedding-name">{{ guestData.wedding.name }}</div>
            <div class="wedding-date" *ngIf="guestData.wedding.wedding_date">
              {{ guestData.wedding.wedding_date | date:"EEEE, d 'de' MMMM 'de' y" }}
            </div>
          </div>

          <!-- Separador floral -->
          <div class="floral-divider">
            <span>❧</span>
          </div>

          <!-- Pregunta principal -->
          <div class="rsvp-question">
            <p>{{ 'RSVP.QUESTION' | translate }}</p>
          </div>

          <!-- Botones de respuesta -->
          <div class="rsvp-buttons">
            <button
              class="rsvp-btn confirm-btn"
              [class.selected]="selectedStatus === 'confirmed'"
              (click)="selectStatus('confirmed')">
              <span class="btn-icon"><app-icon name="planGratuito" [size]="25"></app-icon></span>
              <span class="btn-text">{{ 'RSVP.CONFIRM_BTN' | translate }}</span>
            </button>
            <button
              class="rsvp-btn decline-btn"
              [class.selected]="selectedStatus === 'declined'"
              (click)="selectStatus('declined')">
              <span class="btn-icon"><app-icon name="rechazar" [size]="25"></app-icon></span>
              <span class="btn-text">{{ 'RSVP.DECLINE_BTN' | translate }}</span>
            </button>
          </div>

          <!-- Campos extra (solo si confirma) -->
          <div class="extra-fields" *ngIf="selectedStatus === 'confirmed'">
            <div class="field-group">
              <label>{{ 'RSVP.ALLERGIES_LABEL' | translate }}</label>
              <input
                type="text"
                [(ngModel)]="allergies"
                [placeholder]="'RSVP.ALLERGIES_PLACEHOLDER' | translate"
                class="rsvp-input" />
            </div>
            <div class="field-group">
              <label>{{ 'RSVP.NOTES_LABEL' | translate }}</label>
              <textarea
                [(ngModel)]="dietaryNotes"
                [placeholder]="'RSVP.NOTES_PLACEHOLDER' | translate"
                class="rsvp-input"
                rows="3"></textarea>
            </div>
          </div>

          <!-- Mensaje si declina -->
          <div class="decline-note" *ngIf="selectedStatus === 'declined'">
            <p>{{ 'RSVP.DECLINE_NOTE' | translate }}</p>
          </div>

          <!-- Botón enviar -->
          <button
            class="btn-submit"
            [disabled]="!selectedStatus || sending"
            (click)="submitRsvp()"
            *ngIf="selectedStatus">
            <span *ngIf="!sending">{{ 'RSVP.SUBMIT_BTN' | translate }}</span>
            <span *ngIf="sending" class="sending-dots">
              {{ 'RSVP.SENDING' | translate }}<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>
            </span>
          </button>

          <!-- Código de invitación -->
          <div class="invitation-code">
            <span>{{ 'RSVP.CODE_LABEL' | translate }}: {{ invitationCode }}</span>
          </div>

        </div>

      </div>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Great+Vibes&display=swap');

    :host { display: block; }

    .rsvp-page {
      min-height: 100vh;
      background: #fdf8f3;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Cormorant Garamond', Georgia, serif;
      position: relative;
      overflow: hidden;
      padding: 2rem 1rem;
    }

    .bg-decoration { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
    .petal {
      position: absolute;
      border-radius: 50% 0 50% 0;
      opacity: 0.06;
      background: #bc6c25;
    }
    .p1 { width: 400px; height: 400px; top: -100px; right: -100px; transform: rotate(20deg); }
    .p2 { width: 300px; height: 300px; bottom: -80px; left: -80px; transform: rotate(-30deg); }
    .p3 { width: 200px; height: 200px; top: 40%; left: -60px; transform: rotate(45deg); }
    .p4 { width: 150px; height: 150px; bottom: 20%; right: -40px; transform: rotate(10deg); }

    .rsvp-container {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 480px;
    }

    .brand { text-align: center; margin-bottom: 2rem; }
    .brand-script {
      font-family: 'Great Vibes', cursive;
      font-size: 2.8rem;
      color: #8b5e3c;
      letter-spacing: 1px;
    }

    .state-card {
      background: white;
      border-radius: 20px;
      padding: 3rem 2.5rem;
      text-align: center;
      box-shadow: 0 20px 60px rgba(139, 94, 60, 0.12);
    }
    .state-card h2 { font-family: 'Playfair Display', serif; color: #3d2b1f; margin: 1rem 0 0.5rem; }
    .state-card p { color: #7a6055; line-height: 1.7; }

    .spinner { display: flex; justify-content: center; margin-bottom: 1rem; }
    .ring {
      width: 48px; height: 48px;
      border: 3px solid #f0e6d8;
      border-top-color: #bc6c25;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-text { color: #a08070; font-style: italic; }

    .icon-circle {
      width: 72px; height: 72px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.8rem;
      margin: 0 auto 1.5rem;
    }
    .success-icon { background: #f0f7ec; color: #5c7a4e; }
    .error-icon { background: #fcecea; color: #c0392b; }

    .success-msg { color: #6b5a4e; line-height: 1.8; }
    .wedding-pill {
      display: inline-block;
      margin-top: 1.5rem;
      background: #fef6ed;
      border: 1px solid #e8d5bc;
      border-radius: 50px;
      padding: 0.4rem 1.2rem;
      font-size: 0.9rem;
      color: #8b5e3c;
      letter-spacing: 0.5px;
    }

    .btn-home {
      margin-top: 1.5rem;
      background: none;
      border: 1px solid #bc6c25;
      color: #bc6c25;
      border-radius: 50px;
      padding: 0.6rem 2rem;
      cursor: pointer;
      font-family: inherit;
      font-size: 1rem;
      transition: all 0.2s;
    }
    .btn-home:hover { background: #bc6c25; color: white; }

    .form-card {
      background: white;
      border-radius: 24px;
      padding: 2.5rem 2rem;
      box-shadow: 0 20px 60px rgba(139, 94, 60, 0.12);
      animation: fadeUp 0.4s ease;
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .form-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
    .guest-avatar {
      width: 56px; height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #f0e0cc, #d4a373);
      color: #5c3d1e;
      font-family: 'Playfair Display', serif;
      font-size: 1.4rem;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .guest-label { font-size: 0.78rem; color: #a08070; letter-spacing: 1.5px; text-transform: uppercase; margin: 0 0 0.2rem; }
    .guest-name { font-family: 'Playfair Display', serif; font-size: 1.3rem; color: #3d2b1f; margin: 0; }

    .wedding-info {
      background: #fdf5ec;
      border-left: 3px solid #d4a373;
      border-radius: 0 10px 10px 0;
      padding: 0.9rem 1.2rem;
      margin-bottom: 1.5rem;
    }
    .wedding-name { font-family: 'Playfair Display', serif; font-size: 1.1rem; color: #3d2b1f; margin-bottom: 0.2rem; }
    .wedding-date { font-size: 0.95rem; color: #8b5e3c; font-style: italic; }

    .floral-divider { text-align: center; color: #d4a373; font-size: 1.5rem; margin: 1.2rem 0; }

    .rsvp-question p { text-align: center; font-size: 1.15rem; color: #5c3d1e; font-style: italic; margin-bottom: 1.5rem; }

    .rsvp-buttons { display: flex; gap: 0.8rem; margin-bottom: 1.5rem; }
    .rsvp-btn {
      flex: 1;
      padding: 1rem 0.5rem;
      border-radius: 14px;
      border: 2px solid transparent;
      cursor: pointer;
      font-family: inherit;
      font-size: 0.95rem;
      display: flex; flex-direction: column; align-items: center; gap: 0.4rem;
      transition: all 0.25s;
      background: #fdf5ec;
      color: #6b5a4e;
    }
    .btn-icon { font-size: 1.4rem; }
    .btn-text { font-size: 0.88rem; line-height: 1.3; text-align: center; }

    .confirm-btn.selected {
      background: #5c7a4e; border-color: #5c7a4e; color: white;
      box-shadow: 0 8px 20px rgba(92, 122, 78, 0.3);
      transform: translateY(-2px);
    }
    .confirm-btn:not(.selected):hover { border-color: #5c7a4e; color: #5c7a4e; }

    .decline-btn.selected {
      background: #8b7e74; border-color: #8b7e74; color: white;
      box-shadow: 0 8px 20px rgba(139, 126, 116, 0.3);
      transform: translateY(-2px);
    }
    .decline-btn:not(.selected):hover { border-color: #8b7e74; color: #8b7e74; }

    .extra-fields { animation: fadeUp 0.3s ease; }
    .field-group { margin-bottom: 1rem; }
    .field-group label { display: block; font-size: 0.85rem; color: #8b5e3c; letter-spacing: 0.5px; margin-bottom: 0.4rem; }
    .rsvp-input {
      width: 100%;
      border: 1px solid #e8d5bc;
      border-radius: 10px;
      padding: 0.65rem 0.9rem;
      font-family: inherit;
      font-size: 1rem;
      color: #3d2b1f;
      background: #fdfaf7;
      resize: vertical;
      transition: border-color 0.2s;
      box-sizing: border-box;
    }
    .rsvp-input:focus { outline: none; border-color: #d4a373; }

    .decline-note {
      text-align: center;
      color: #a08070;
      font-style: italic;
      margin-bottom: 0.5rem;
      animation: fadeUp 0.3s ease;
    }

    .btn-submit {
      width: 100%;
      margin-top: 1rem;
      padding: 1rem;
      background: linear-gradient(135deg, #d4a373, #bc6c25);
      color: white;
      border: none;
      border-radius: 14px;
      font-family: 'Playfair Display', serif;
      font-size: 1.05rem;
      cursor: pointer;
      letter-spacing: 0.5px;
      transition: all 0.25s;
      box-shadow: 0 6px 20px rgba(188, 108, 37, 0.3);
    }
    .btn-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(188, 108, 37, 0.4); }
    .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

    .sending-dots .dot { animation: blink 1.2s infinite; }
    .sending-dots .dot:nth-child(2) { animation-delay: 0.2s; }
    .sending-dots .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes blink { 0%, 80%, 100% { opacity: 0; } 40% { opacity: 1; } }

    .invitation-code {
      text-align: center;
      margin-top: 1.5rem;
      font-size: 0.78rem;
      color: #c4a882;
      letter-spacing: 1px;
    }

    @media (max-width: 480px) {
      .form-card { padding: 2rem 1.5rem; }
      .rsvp-buttons { flex-direction: column; }
    }
  `]
})
export class RsvpComponent implements OnInit {

  invitationCode: string = '';
  state: RsvpState = 'loading';
  errorMsg: string = '';

  guestData: any = null;
  selectedStatus: 'confirmed' | 'declined' | null = null;
  confirmedStatus: 'confirmed' | 'declined' | null = null;

  allergies: string = '';
  dietaryNotes: string = '';
  sending: boolean = false;

  private apiUrl = 'http://localhost:3000/api';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.invitationCode = this.route.snapshot.paramMap.get('code') || '';

    if (!this.invitationCode) {
      this.state = 'error';
      this.errorMsg = this.translate.instant('RSVP.ERROR_NO_CODE');
      return;
    }

    this.loadGuestInfo();
  }

  private loadGuestInfo(): void {
    this.http.get<any>(`${this.apiUrl}/rsvp/${this.invitationCode}/info`).subscribe({
      next: (res) => {
        this.guestData = res?.data ?? res;
        this.state = 'form';
      },
      error: () => {
        this.guestData = null;
        this.state = 'form';
      }
    });
  }

  selectStatus(status: 'confirmed' | 'declined'): void {
    this.selectedStatus = status;
  }

  async submitRsvp(): Promise<void> {
    if (!this.selectedStatus || this.sending) return;

    this.sending = true;

    const body: any = { rsvp_status: this.selectedStatus };
    if (this.selectedStatus === 'confirmed') {
      if (this.allergies.trim()) body.allergies = this.allergies.trim();
      if (this.dietaryNotes.trim()) body.dietary_notes = this.dietaryNotes.trim();
    }

    this.http.patch<any>(`${this.apiUrl}/rsvp/${this.invitationCode}`, body).subscribe({
      next: (res) => {
        this.guestData = res?.data ?? res;
        this.confirmedStatus = this.selectedStatus;
        this.state = 'success';
        this.sending = false;
      },
      error: (err) => {
        this.errorMsg = err?.error?.message || this.translate.instant('RSVP.ERROR_DEFAULT');
        this.state = 'error';
        this.sending = false;
      }
    });
  }

  getInitial(): string {
    if (this.guestData?.first_name) return this.guestData.first_name.charAt(0).toUpperCase();
    return '?';
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }
}