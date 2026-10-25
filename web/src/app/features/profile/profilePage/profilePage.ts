import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { SessionService } from '../../../core/services/session.service';
import { apiConfig } from '../../../core/api-config';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profilePage.html',
  styleUrl: './profilePage.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage implements OnInit {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  public readonly session = inject(SessionService);

  displayName = '';
  email = '';
  uid = '';
  initials = '';
  emailVerified = false;

  editingName = false;
  newName = '';
  savingName = false;

  ngOnInit(): void {
    const user = this.auth.currentUser;
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }
    this.displayName = user.displayName || user.email || 'User';
    this.email = user.email || '';
    this.uid = user.uid;
    this.emailVerified = user.emailVerified;
    this.initials = this.computeInitials(this.displayName);
  }

  startEditingName(): void {
    this.editingName = true;
    this.newName = this.displayName;
  }

  cancelEditingName(): void {
    this.editingName = false;
    this.newName = '';
  }

  async saveName(): Promise<void> {
    const trimmed = this.newName.trim();
    if (!trimmed || this.savingName) return;

    this.savingName = true;
    try {
      const token = await this.auth.currentUser?.getIdToken();
      const res = await fetch(`${apiConfig.baseUrl}/users/display-name`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ displayName: trimmed }),
      });

      if (!res.ok) {
        throw new Error('Failed to update name on backend');
      }

      const result = await res.json();
      const user = this.auth.currentUser;
      if (user) {
        await user.reload();
      }

      this.displayName = result.displayName;
      this.initials = this.computeInitials(this.displayName);
      this.editingName = false;
      this.newName = '';
    } catch (err) {
      console.error('Failed to save display name', err);
      alert('Could not save your name. Please try again.');
    } finally {
      this.savingName = false;
    }
  }

  async logout(): Promise<void> {
    await this.session.logout();
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  private computeInitials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
}
