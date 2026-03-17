import { Component, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { FormsModule }       from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService }       from '../../services/auth/auth.service';
import { ColaboradoresService, Member, Invite } from '../../services/colaboradores/colaboradores.service';
import { Router } from '@angular/router';
import { IconComponent } from '../../shared/icons/icon.component';

@Component({
  selector:    'app-colaboradores',
  standalone:  true,
  imports:     [CommonModule, FormsModule, TranslateModule, IconComponent],
  templateUrl: './colaboradores.component.html',
  styleUrl:    './colaboradores.component.css',
})
export class ColaboradoresComponent implements OnInit {

  members:  Member[] = [];
  invites:  Invite[] = [];
  loading   = true;
  error:    string | null = null;

  showModal    = false;
  inviteEmail  = '';
  inviteRole   = 'co_organizer';
  sending      = false;
  sendError:   string | null = null;
  sendSuccess  = false;

  confirmTarget: { type: 'member' | 'invite'; id: string; label: string } | null = null;

  editingRoleFor: string | null = null;
  editingRole     = '';
  savingRole      = false;

  readonly roles = [
    { value: 'co_organizer', label: 'AUTH.CO_ORGANIZER' },
    { value: 'planner',      label: 'AUTH.PLANNER'      },
    { value: 'guest',        label: 'AUTH.GUEST'         },
  ];

  constructor(
    public  authService: AuthService,
    private router:      Router,
    private svc:         ColaboradoresService,
    private translate:   TranslateService,
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    const weddingId = this.authService.getWeddingId();
    if (!weddingId) return;

    this.loading  = true;
    this.error    = null;
    this._loaded  = 0;

    this.svc.getMembers(weddingId).subscribe({
      next:  m => { this.members = m; this.checkDone(); },
      error: () => {
        this.error   = this.translate.instant('COLLABORATORS.ERROR_LOAD_MEMBERS');
        this.loading = false;
      },
    });

    this.svc.getInvites(weddingId).subscribe({
      next:  i => { this.invites = i; this.checkDone(); },
      error: () => {
        this.error   = this.translate.instant('COLLABORATORS.ERROR_LOAD_INVITES');
        this.loading = false;
      },
    });
  }

  private _loaded = 0;
  private checkDone(): void { if (++this._loaded >= 2) this.loading = false; }

  inviteStatus(inv: Invite): 'accepted' | 'declined' | 'expired' | 'pending' {
    if (inv.accepted_at) return 'accepted';
    if (inv.declined_at) return 'declined';
    if (new Date(inv.expires_at) < new Date()) return 'expired';
    return 'pending';
  }

  get pendingInvites(): Invite[] {
    return this.invites.filter(i => !i.accepted_at);
  }

  openModal(): void {
    this.showModal   = true;
    this.inviteEmail = '';
    this.inviteRole  = 'co_organizer';
    this.sendError   = null;
    this.sendSuccess = false;
  }

  closeModal(): void { this.showModal = false; }

  submitInvite(): void {
    const weddingId = this.authService.getWeddingId();
    if (!weddingId || !this.inviteEmail) return;

    this.sending     = true;
    this.sendError   = null;
    this.sendSuccess = false;

    this.svc.sendInvite(weddingId, this.inviteEmail, this.inviteRole).subscribe({
      next: () => {
        this.sending     = false;
        this.sendSuccess = true;
        setTimeout(() => { this.closeModal(); this.load(); }, 1500);
      },
      error: (err) => {
        this.sending   = false;
        this.sendError = err?.error?.message
          ?? this.translate.instant('COLLABORATORS.ERROR_SEND_INVITE');
      },
    });
  }

  startEditRole(member: Member): void {
    this.editingRoleFor = member.user.id;
    this.editingRole    = member.role;
  }

  cancelEditRole(): void {
    this.editingRoleFor = null;
    this.editingRole    = '';
  }

  saveRole(member: Member): void {
    if (this.editingRole === member.role) { this.cancelEditRole(); return; }

    const weddingId = this.authService.getWeddingId();
    if (!weddingId) return;

    this.savingRole = true;

    this.svc.updateMemberRole(weddingId, member.user.id, this.editingRole).subscribe({
      next: () => {
        this.savingRole     = false;
        this.editingRoleFor = null;
        this.load();
      },
      error: (err) => {
        this.savingRole = false;
        this.error = err?.error?.message
          ?? this.translate.instant('COLLABORATORS.ERROR_CHANGE_ROLE');
      },
    });
  }

  askRevoke(type: 'member' | 'invite', id: string, label: string): void {
    this.confirmTarget = { type, id, label };
  }

  cancelRevoke(): void { this.confirmTarget = null; }

  confirmRevoke(): void {
    const weddingId = this.authService.getWeddingId();
    if (!weddingId || !this.confirmTarget) return;

    const { type, id } = this.confirmTarget;
    this.confirmTarget = null;

    const call = type === 'member'
      ? this.svc.revokeMember(weddingId, id)
      : this.svc.revokeInvite(weddingId, id);

    call.subscribe({
      next: () => {
        if (type === 'member' && id === this.authService.getUserId()) {
          localStorage.removeItem('weddingId');
          localStorage.removeItem('weddingRole');
          this.router.navigate(['/mis-bodas']);
          return;
        }
        this.load();
      },
      error: (err) => {
        this.error = err?.error?.message
          ?? this.translate.instant('COLLABORATORS.ERROR_REVOKE');
      },
    });
  }

  isOwner(): boolean { return this.authService.getWeddingRole() === 'owner'; }

  roleLabel(role: string): string {
    const map: Record<string, string> = {
      owner:        'WEDDINGS.ROLE_OWNER',
      co_organizer: 'AUTH.CO_ORGANIZER',
      planner:      'AUTH.PLANNER',
      guest:        'AUTH.GUEST',
    };
    return map[role] ?? role;
  }

  roleClass(role: string): string {
    const map: Record<string, string> = {
      owner:        'badge-owner',
      co_organizer: 'badge-co',
      planner:      'badge-planner',
      guest:        'badge-guest',
    };
    return map[role] ?? '';
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      pending:  'COLLABORATORS.STATUS_PENDING',
      accepted: 'COLLABORATORS.STATUS_ACCEPTED',
      declined: 'COLLABORATORS.STATUS_DECLINED',
      expired:  'COLLABORATORS.STATUS_EXPIRED',
    };
    return map[status] ?? status;
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      pending:  'status-pending',
      accepted: 'status-accepted',
      declined: 'status-declined',
      expired:  'status-expired',
    };
    return map[status] ?? '';
  }

  getInitial(name: string): string {
    return (name || '?').charAt(0).toUpperCase();
  }
}