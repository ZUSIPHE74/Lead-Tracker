import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  Auth,
  authState,
  signInWithEmailAndPassword,
  signOut,
  UserCredential,
} from '@angular/fire/auth';
import { firstValueFrom } from 'rxjs';
import { DEMO_ACCOUNTS, DemoAccount } from '../demo-accounts';
import { AppConfigService } from '../../../core/services/app-config.service';
import { RoleService } from '../../../core/services/role.service';

const ALLOWED_DOMAIN = '@moderntech.co.za';
const LOGIN_TIMEOUT_MS = 15000;
const VISITED_KEY = 'has_logged_in_before';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './loginPage.html',
  styleUrl: './loginPage.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage implements OnInit {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly roleService = inject(RoleService);
  private readonly appConfig = inject(AppConfigService);

  email = '';
  password = '';
  error = signal<string>('');
  isSubmitting = signal<boolean>(false);
  isReturningUser = false;
  showPassword = signal<boolean>(false);
  autoFilledRole = signal<string>('');
  readonly demoAccounts = DEMO_ACCOUNTS;
  /** Demo shortcuts show only when the API reports DEMO_MODE=true. */
  readonly demoMode = this.appConfig.demoMode;

  async ngOnInit(): Promise<void> {
    this.isReturningUser = localStorage.getItem(VISITED_KEY) === 'true';
    void this.appConfig.load();

    try {
      const user = await firstValueFrom(authState(this.auth));

      if (user) {
        if (!this.isAllowedEmail(user?.email)) {
          await signOut(this.auth);
          this.error.set('Only @moderntech.co.za email addresses are allowed to sign in.');
        } else {
          await this.router.navigate(['/dashboard']);
        }
      }
    } catch (err) {
      console.error('Auth state check failed:', err);
    }
  }

  togglePassword(): void {
    this.showPassword.update((val) => !val);
  }

  /** Fills the form with a demo account. Deliberately does not submit. */
  fillDemoAccount(account: DemoAccount): void {
    this.email = account.email;
    this.password = account.password;
    this.error.set('');
    this.autoFilledRole.set(account.label);
  }

  private isAllowedEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    return email.toLowerCase().trim().endsWith(ALLOWED_DOMAIN);
  }

  async onLogin(): Promise<void> {
    // Prevent double-submits.
    if (this.isSubmitting()) return;

    const emailValue = this.email.trim();
    const passwordValue = this.password;

    // Always give the user feedback, even on empty input.
    if (!emailValue && !passwordValue) {
      this.error.set('Please enter your email and password.');
      return;
    }
    if (!emailValue) {
      this.error.set('Please enter your email address.');
      return;
    }
    if (!passwordValue) {
      this.error.set('Please enter your password.');
      return;
    }

    const normalized = emailValue.toLowerCase();

    if (!normalized.endsWith(ALLOWED_DOMAIN)) {
      this.error.set('Only @moderntech.co.za email addresses are allowed to sign in.');
      return;
    }

    this.error.set('');
    this.isSubmitting.set(true);

    try {
      // Sign-up is invite-only: unknown addresses are never created from here.
      const cred: UserCredential = await this.withTimeout(
        signInWithEmailAndPassword(this.auth, normalized, passwordValue),
        LOGIN_TIMEOUT_MS,
      );

      if (!this.isAllowedEmail(cred.user.email)) {
        await signOut(this.auth);
        this.error.set('Only @moderntech.co.za email addresses are allowed to sign in.');
        return;
      }

      // The API decides whether this account is invited (and whether demo accounts
      // are enabled). Firebase accepting the password is not enough on its own.
      const access = await this.roleService.checkAccess();
      if (!access.ok) {
        await signOut(this.auth);
        this.error.set(access.message);
        return;
      }

      localStorage.setItem(VISITED_KEY, 'true');
      await this.router.navigate(['/dashboard']);
    } catch (err) {
      this.error.set(this.describeAuthError(err));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  /**
   * Wraps a promise with a timeout so the UI doesn't hang forever when the
   * backend is unreachable.
   */
  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('auth/network-timeout')), ms);
      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        },
      );
    });
  }

  private describeAuthError(err: unknown): string {
    const code =
      (err as { code?: string })?.code ?? (err instanceof Error ? err.message : '') ?? '';

    console.error('Login failed:', err);

    switch (code) {
      case 'auth/network-request-failed':
      case 'auth/network-timeout':
      case 'auth/internal-error':
        return 'Unable to connect right now. Please check your internet connection and try again.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-disabled':
        return 'This account has been disabled. Please contact support.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect email or password. New to Lead Tracker? Contact your admin to be invited.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please wait a moment and try again.';
      default:
        return 'Login failed. Please try again.';
    }
  }
}
