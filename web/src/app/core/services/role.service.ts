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

// The free Render API can take up to a minute to wake, so a failed profile load is retried.
const PROFILE_ATTEMPTS = 4;
const PROFILE_RETRY_MS = 2000;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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

  /** The profile load for the signed-in account; shared by everyone who asks for it. */
  private profileRequest: { uid: string; promise: Promise<UserProfile | null> } | null = null;

  constructor() {
    authState(this.auth).subscribe((user: User | null) => {
      if (user && this.profileRequest?.uid === user.uid) return;
      // Least privilege until the backend profile for this account says otherwise
      this.profileRequest = null;
      this.role.set('agent');
      this.profileLoaded.set(false);
      if (user) void this.fetchProfile();
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
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        // Same endpoint as the profile, so the role is known the moment sign-in succeeds.
        const uid = this.auth.currentUser?.uid;
        if (uid && data.user) {
          this.applyProfile(data.user);
          this.profileRequest = { uid, promise: Promise.resolve(data.user) };
        }
        return { ok: true };
      }
      return { ok: false, message: data.error || 'You do not have access to this app.' };
    } catch {
      return { ok: false, message: 'Unable to reach the server. Please try again.' };
    }
  }

  /**
   * Loads the signed-in account's profile once; concurrent callers share the request.
   * A failed load is not kept, so the next caller (e.g. the admin guard) tries again.
   */
  fetchProfile(): Promise<UserProfile | null> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return Promise.resolve(null);
    if (this.profileRequest?.uid !== uid) {
      const promise = this.requestProfile(uid);
      this.profileRequest = { uid, promise };
      void promise.then((profile) => {
        if (!profile && this.profileRequest?.promise === promise) this.profileRequest = null;
      });
    }
    return this.profileRequest!.promise;
  }

  private async requestProfile(uid: string): Promise<UserProfile | null> {
    for (let attempt = 0; attempt < PROFILE_ATTEMPTS; attempt++) {
      if (attempt > 0) await delay(PROFILE_RETRY_MS * attempt);
      // Signed out or switched accounts while waiting: this answer is no longer wanted.
      if (this.auth.currentUser?.uid !== uid) return null;
      try {
        const headers = await this.getAuthHeaders();
        const res = await fetch(`${apiConfig.baseUrl}/users/profile`, { headers });
        if (res.ok) {
          const data = await res.json();
          if (!data.user || this.auth.currentUser?.uid !== uid) return null;
          this.applyProfile(data.user);
          return data.user;
        }
        // 401/403 will not change on retry; 5xx usually means the API is still waking.
        if (res.status < 500) return null;
      } catch (err) {
        console.warn('Could not fetch user profile from backend API:', err);
      }
    }
    return null;
  }

  private applyProfile(profile: UserProfile): void {
    this.role.set(profile.role);
    this.department.set(profile.department || 'Talent Acquisition');
    this.profileLoaded.set(true);
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
