import { Injectable, inject, signal } from '@angular/core';
import { Auth, signOut } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { apiConfig } from '../api-config';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const WARNING_BEFORE_MS = 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 60 * 1000;
const TOKEN_PREFIX = 'sessionToken:';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private lastActivity = Date.now();
  private started = false;
  private sessionToken: string | null = null;

  showTimeoutWarning = signal(false);
  secondsUntilLogout = signal(0);

  private async getAuthHeaders(): Promise<Record<string, string>> {
    await this.auth.authStateReady();
    const token = await this.auth.currentUser?.getIdToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.lastActivity = Date.now();

    ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'].forEach((ev) => {
      window.addEventListener(ev, this.onActivity, { passive: true });
    });

    void this.startServerSession();

    this.heartbeatTimer = setInterval(() => {
      void this.tick();
    }, HEARTBEAT_INTERVAL_MS);
  }

  stop(): void {
    this.started = false;

    ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'].forEach((ev) => {
      window.removeEventListener(ev, this.onActivity);
    });

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    this.showTimeoutWarning.set(false);
    this.secondsUntilLogout.set(0);
  }

  stayLoggedIn(): void {
    this.lastActivity = Date.now();
    this.showTimeoutWarning.set(false);
    void this.tick();
  }

  async logout(): Promise<void> {
    this.stop();
    this.clearStoredToken();
    try {
      const headers = await this.getAuthHeaders();
      await fetch(`${apiConfig.baseUrl}/session/end`, {
        method: 'POST',
        headers,
      });
    } catch {
      // ignore — we're logging out anyway
    }
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }

  private onActivity = (): void => {
    this.lastActivity = Date.now();
    if (this.showTimeoutWarning()) {
      this.showTimeoutWarning.set(false);
    }
  };

  private async startServerSession(): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return;

    const stored = localStorage.getItem(TOKEN_PREFIX + user.uid);
    if (stored) {
      this.sessionToken = stored;
      return;
    }

    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${apiConfig.baseUrl}/session/start`, {
        method: 'POST',
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        const token = data.sessionToken;
        if (token) {
          this.sessionToken = token;
          localStorage.setItem(TOKEN_PREFIX + user.uid, token);
        }
      }
    } catch (err) {
      console.error('Failed to start server session', err);
    }
  }

  private clearStoredToken(): void {
    const user = this.auth.currentUser;
    if (user) {
      localStorage.removeItem(TOKEN_PREFIX + user.uid);
    }
    this.sessionToken = null;
  }

  private async tick(): Promise<void> {
    const idleMs = Date.now() - this.lastActivity;

    if (idleMs >= IDLE_TIMEOUT_MS - WARNING_BEFORE_MS && idleMs < IDLE_TIMEOUT_MS) {
      const remaining = Math.ceil((IDLE_TIMEOUT_MS - idleMs) / 1000);
      this.secondsUntilLogout.set(remaining);
      this.showTimeoutWarning.set(true);
    }

    if (idleMs >= IDLE_TIMEOUT_MS) {
      await this.forceLogout('You were logged out due to inactivity.');
      return;
    }

    if (!this.sessionToken) {
      return;
    }

    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${apiConfig.baseUrl}/session/heartbeat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ sessionToken: this.sessionToken }),
      });
      if (!res.ok) {
        throw new Error('Heartbeat rejected');
      }
    } catch (err) {
      console.error('Heartbeat failed', err);
      await this.forceLogout('Your session expired or was signed in elsewhere.');
    }
  }

  private async forceLogout(message: string): Promise<void> {
    this.stop();
    this.clearStoredToken();
    try {
      await signOut(this.auth);
    } catch {
      // ignore
    }
    alert(message);
    this.router.navigate(['/login']);
  }
}
