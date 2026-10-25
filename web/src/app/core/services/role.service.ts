import { Injectable, inject, signal, computed } from '@angular/core';
import { Auth, User, authState } from '@angular/fire/auth';
import { apiConfig } from '../api-config';

export type UserRole = 'admin' | 'manager' | 'agent';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  department: string;
  isAdmin: boolean;
}

export interface ManagementStats {
  totalLeads: number;
  conversionRate: number;
  statusCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
  recruiterWorkload: Record<string, number>;
  totalTeam: number;
}

export interface TeamMember {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  department: string;
  leadsAssigned: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class RoleService {
  private readonly auth = inject(Auth);

  readonly role = signal<UserRole>('agent');
  readonly department = signal<string>('Talent Acquisition');
  readonly profileLoaded = signal<boolean>(false);

  readonly isAdmin = computed(() => {
    const r = this.role();
    return r === 'admin' || r === 'manager';
  });

  constructor() {
    authState(this.auth).subscribe((user: User | null) => {
      if (user) {
        // Least privilege until the backend profile says otherwise
        this.role.set('agent');
        void this.fetchProfile();
      } else {
        this.role.set('agent');
        this.profileLoaded.set(false);
      }
    });
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    await this.auth.authStateReady();
    const token = await this.auth.currentUser?.getIdToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  /**
   * Asks the API whether the signed-in account may use the app. Firebase sign-in
   * alone is not enough: sign-up is invite-only and demo accounts can be disabled.
   */
  async checkAccess(): Promise<{ ok: true } | { ok: false; message: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${apiConfig.baseUrl}/users/profile`, { headers });
      if (res.ok) return { ok: true };
      const data = await res.json().catch(() => ({}));
      return { ok: false, message: data.error || 'You do not have access to this app.' };
    } catch {
      return { ok: false, message: 'Unable to reach the server. Please try again.' };
    }
  }

  async fetchProfile(): Promise<UserProfile | null> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${apiConfig.baseUrl}/users/profile`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          this.role.set(data.user.role);
          this.department.set(data.user.department || 'Talent Acquisition');
          this.profileLoaded.set(true);
          return data.user;
        }
      }
    } catch (err) {
      console.warn('Could not fetch user profile from backend API:', err);
    }
    return null;
  }

  async getManagementStats(): Promise<ManagementStats | null> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${apiConfig.baseUrl}/admin/stats`, { headers });
      if (res.ok) {
        const data = await res.json();
        return data.stats;
      }
    } catch (err) {
      console.error('Failed to get management stats:', err);
    }
    return null;
  }

  async getTeam(): Promise<TeamMember[]> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${apiConfig.baseUrl}/admin/team`, { headers });
      if (res.ok) {
        const data = await res.json();
        return data.team || [];
      }
    } catch (err) {
      console.error('Failed to get team members:', err);
    }
    return [];
  }

  async updateUserRole(userId: string, newRole: UserRole): Promise<boolean> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${apiConfig.baseUrl}/admin/users/role`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId, role: newRole }),
      });
      return res.ok;
    } catch (err) {
      console.error('Failed to update role:', err);
      return false;
    }
  }

  async inviteUser(
    email: string,
    displayName: string,
    role: UserRole,
  ): Promise<{ ok: true; email: string; setupLink: string } | { ok: false; message: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${apiConfig.baseUrl}/admin/users/invite`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, displayName, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) return { ok: true, email: data.user.email, setupLink: data.setupLink };
      return { ok: false, message: data.error || 'Could not invite this user.' };
    } catch {
      return { ok: false, message: 'Unable to reach the server. Please try again.' };
    }
  }

  async reassignLeads(fromRecruiter: string, toRecruiter: string): Promise<number> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${apiConfig.baseUrl}/admin/reassign`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ fromRecruiter, toRecruiter }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.count || 0;
      }
    } catch (err) {
      console.error('Failed to reassign leads:', err);
    }
    return 0;
  }
}
