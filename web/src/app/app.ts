import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { Auth, User, authState } from '@angular/fire/auth';
import { SessionService } from './core/services/session.service';
import { RoleService } from './core/services/role.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  public readonly session = inject(SessionService);
  public readonly roleService = inject(RoleService);

  userEmail = '';
  userName = '';
  private readonly signedIn = signal(false);
  /** Firebase sign-in is not enough: the shell appears only once the API confirms access. */
  readonly showTopBar = computed(() => this.signedIn() && this.roleService.profileLoaded());
  currentUrl = signal('');
  /** A saved session is waiting on the API (the login page shows its own message). */
  readonly connecting = computed(
    () =>
      this.signedIn() &&
      !this.roleService.profileLoaded() &&
      !this.currentUrl().startsWith('/login'),
  );
  profileMenuOpen = signal(false);

  constructor() {
    authState(this.auth).subscribe((user: User | null) => {
      this.userEmail = user?.email ?? '';
      this.userName = user?.displayName || user?.email || '';
      this.signedIn.set(!!user);
    });

    effect(() => {
      const active = this.showTopBar();
      untracked(() => (active ? this.session.start() : this.session.stop()));
    });

    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e) => {
      const url = (e as NavigationEnd).urlAfterRedirects;
      this.currentUrl.set(url);
      this.profileMenuOpen.set(false);
    });
  }

  isActive(path: string): boolean {
    const url = this.currentUrl();
    if (path === '/leads') {
      return url === '/leads' || (url.startsWith('/leads/') && !url.startsWith('/leads/new'));
    }
    return url === path || url.startsWith(path + '/');
  }

  toggleProfileMenu(): void {
    this.profileMenuOpen.update((v) => !v);
  }

  closeProfileMenu(): void {
    this.profileMenuOpen.set(false);
  }

  goTo(path: string): void {
    this.profileMenuOpen.set(false);
    this.router.navigate([path]);
  }

  goToDashboard(): void {
    this.profileMenuOpen.set(false);
    this.router.navigate(['/dashboard']);
  }

  async logout(): Promise<void> {
    this.profileMenuOpen.set(false);
    await this.session.logout();
  }
}
