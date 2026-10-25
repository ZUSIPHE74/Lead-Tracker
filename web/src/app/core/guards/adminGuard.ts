import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { RoleService } from '../services/role.service';

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);
  const roleService = inject(RoleService);

  await auth.authStateReady();
  const user = auth.currentUser;

  if (!user) {
    return router.createUrlTree(['/login']);
  }

  // Role comes from the backend profile only; the API enforces it regardless.
  if (roleService.isAdmin()) {
    return true;
  }

  // Attempt to fetch profile once if not loaded
  const profile = await roleService.fetchProfile();
  if (profile?.isAdmin) {
    return true;
  }

  alert('Access Restricted: This section requires Administrator or Management privileges.');
  return router.createUrlTree(['/dashboard']);
};
