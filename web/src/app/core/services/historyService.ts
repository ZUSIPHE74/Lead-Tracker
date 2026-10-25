import { Injectable, inject, signal } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { apiConfig } from '../api-config';

export type HistoryAction = 'created' | 'updated' | 'deleted' | 'status-changed';

export interface HistoryEntry {
  id: string;
  timestamp: string;
  action: HistoryAction;
  leadId: string;
  leadDisplayNumber: number;
  leadCompany: string;
  userEmail: string;
  userName: string;
  field?: string;
  fromValue?: unknown;
  toValue?: unknown;
}

export type HistoryScope = 'mine' | 'all';

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private readonly auth = inject(Auth);
  private readonly entries = signal<HistoryEntry[]>([]);
  private readonly loading = signal(false);
  private readonly scope = signal<HistoryScope>('mine');

  private async getAuthHeaders(): Promise<Record<string, string>> {
    await this.auth.authStateReady();
    const token = await this.auth.currentUser?.getIdToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  getHistory() {
    return this.entries.asReadonly();
  }

  getLoading() {
    return this.loading.asReadonly();
  }

  getScope() {
    return this.scope.asReadonly();
  }

  async load(scope: HistoryScope): Promise<void> {
    this.scope.set(scope);
    this.loading.set(true);
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${apiConfig.baseUrl}/history?scope=${encodeURIComponent(scope)}`, {
        method: 'GET',
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        this.entries.set(data.entries ?? []);
      } else {
        this.entries.set([]);
      }
    } catch (err) {
      console.error('Failed to load history', err);
      this.entries.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  async refresh(): Promise<void> {
    await this.load(this.scope());
  }

  async clearMine(): Promise<number> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${apiConfig.baseUrl}/history/clear-mine`, {
        method: 'POST',
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        const deleted = data.deleted ?? 0;
        await this.refresh();
        return deleted;
      }
    } catch (err) {
      console.error('Failed to clear history', err);
    }
    return 0;
  }
}
