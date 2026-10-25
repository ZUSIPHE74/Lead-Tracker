import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  RoleService,
  ManagementStats,
  TeamMember,
  UserRole,
} from '../../../core/services/role.service';

@Component({
  selector: 'app-admin-management-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './adminManagementPage.html',
  styleUrl: './adminManagementPage.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminManagementPage implements OnInit {
  private readonly roleService = inject(RoleService);
  private readonly router = inject(Router);

  readonly stats = signal<ManagementStats | null>(null);
  readonly team = signal<TeamMember[]>([]);
  readonly loading = signal<boolean>(true);
  readonly updatingUser = signal<string | null>(null);

  // Reassignment modal
  readonly showReassignModal = signal<boolean>(false);
  fromRecruiter = '';
  toRecruiter = '';
  readonly reassigning = signal<boolean>(false);
  readonly reassignSuccessMessage = signal<string>('');

  // Invite form (sign-up is invite-only)
  inviteEmail = '';
  inviteName = '';
  inviteRole: UserRole = 'agent';
  readonly inviting = signal<boolean>(false);
  readonly inviteError = signal<string>('');
  readonly inviteLink = signal<string>('');
  readonly invitedEmail = signal<string>('');

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    try {
      const [statsData, teamData] = await Promise.all([
        this.roleService.getManagementStats(),
        this.roleService.getTeam(),
      ]);

      this.stats.set(statsData);
      this.team.set(teamData);

      if (teamData.length >= 2) {
        this.fromRecruiter = teamData[0].displayName || teamData[0].email;
        this.toRecruiter = teamData[1].displayName || teamData[1].email;
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      this.loading.set(false);
    }
  }

  async onRoleChange(member: TeamMember, newRoleString: string): Promise<void> {
    const newRole = newRoleString as UserRole;
    if (member.role === newRole) return;

    this.updatingUser.set(member.id);
    const success = await this.roleService.updateUserRole(member.id, newRole);

    if (success) {
      this.team.update((members) =>
        members.map((m) => (m.id === member.id ? { ...m, role: newRole } : m)),
      );
    } else {
      alert('Could not update role. Please ensure backend permissions are active.');
    }
    this.updatingUser.set(null);
  }

  async inviteMember(): Promise<void> {
    if (this.inviting()) return;
    this.inviteError.set('');
    this.inviteLink.set('');
    if (!this.inviteEmail.trim()) {
      this.inviteError.set('Enter the email address to invite.');
      return;
    }

    this.inviting.set(true);
    const result = await this.roleService.inviteUser(
      this.inviteEmail,
      this.inviteName,
      this.inviteRole,
    );
    this.inviting.set(false);

    if (!result.ok) {
      this.inviteError.set(result.message);
      return;
    }
    this.invitedEmail.set(result.email);
    this.inviteLink.set(result.setupLink);
    this.inviteEmail = '';
    this.inviteName = '';
    this.inviteRole = 'agent';
    await this.loadData();
  }

  openReassign(): void {
    this.reassignSuccessMessage.set('');
    this.showReassignModal.set(true);
  }

  closeReassign(): void {
    this.showReassignModal.set(false);
  }

  async executeReassign(): Promise<void> {
    if (!this.fromRecruiter || !this.toRecruiter) {
      alert('Please select both source and destination recruiters.');
      return;
    }
    if (this.fromRecruiter === this.toRecruiter) {
      alert('Cannot reassign leads to the same person.');
      return;
    }

    this.reassigning.set(true);
    try {
      const count = await this.roleService.reassignLeads(this.fromRecruiter, this.toRecruiter);
      this.reassignSuccessMessage.set(
        `Successfully reassigned ${count} leads to ${this.toRecruiter}!`,
      );
      await this.loadData();
    } catch (err) {
      console.error('Reassignment failed:', err);
      alert('Failed to reassign leads.');
    } finally {
      this.reassigning.set(false);
    }
  }

  goToLeads(): void {
    this.router.navigate(['/leads']);
  }
}
