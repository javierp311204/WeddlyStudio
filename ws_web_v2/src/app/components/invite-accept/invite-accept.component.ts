import { Component, OnInit }  from '@angular/core';
import { CommonModule }        from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService }         from '../../services/auth/auth.service';
import { IconComponent } from '../../shared/icons/icon.component';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

type PageState = 'loading' | 'preview' | 'accepting' | 'success' | 'error';

interface InvitePreview {
  email:       string;
  role:        string;
  expires_at:  string;
  accepted_at: string | null;
  wedding: {
    name:          string;
    wedding_date:  string;
    location_name: string | null;
  };
  inviter: {
    first_name: string;
    last_name:  string;
  };
}

@Component({
  selector:    'app-invite-accept',
  standalone:  true,
  imports:     [CommonModule, RouterModule, TranslateModule, IconComponent],
  templateUrl: './invite-accept.component.html',
  styleUrl:    './invite-accept.component.css',
})
export class InviteAcceptComponent implements OnInit {

  state:       PageState     = 'loading';
  isAccepting  = false;
  token:       string        = '';
  preview:     InvitePreview | null = null;
  errorMsg     = '';

  constructor(
    private route:       ActivatedRoute,
    private router:      Router,
    private http:        HttpClient,
    private translate:   TranslateService,
    public  authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.token) {
      this.errorMsg = this.translate.instant('INVITE.INVALID_TOKEN');
      this.state    = 'error';
      return;
    }
    this.loadPreview();
  }

  loadPreview(): void {
    this.state = 'loading';
    this.http.get<any>(`${API}/invites/preview/${this.token}`).subscribe({
      next: (res) => {
        this.preview = res?.data ?? res;
        this.state   = 'preview';
      },
      error: (err) => {
        this.errorMsg = err?.error?.message
          ?? this.translate.instant('INVITE.INVALID_OR_EXPIRED');
        this.state = 'error';
      },
    });
  }

  accept(): void {
    this.state       = 'accepting';
    this.isAccepting = true;

    this.http.post<any>(`${API}/invites/accept/${this.token}`, {},).subscribe({
      next: (res) => {
        const weddingId = res?.data?.wedding_id ?? '';
        if (weddingId) {
          this.authService.setWeddingId(weddingId);
          localStorage.setItem('weddingRole', res?.data?.role ?? 'guest');
        }
        this.isAccepting = false;
        this.state = 'success';
      },
      error: (err) => {
        this.isAccepting = false;
        this.errorMsg    = err?.error?.message
          ?? this.translate.instant('INVITE.ERROR_ACCEPT');
        this.state       = 'error';
      },
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login'], {
      queryParams: { redirect: `/invites/accept/${this.token}` },
    });
  }

  goToRegister(): void {
    this.router.navigate(['/register'], {
      queryParams: { redirect: `/invites/accept/${this.token}` },
    });
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  roleLabel(role: string): string {
    const map: Record<string, string> = {
      co_organizer: 'AUTH.CO_ORGANIZER',
      planner:      'AUTH.PLANNER',
      guest:        'AUTH.GUEST',
      owner:        'WEDDINGS.ROLE_OWNER',
    };
    return map[role] ?? role;
  }

  isExpired(): boolean {
    if (!this.preview) return false;
    return new Date(this.preview.expires_at) < new Date();
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }
}