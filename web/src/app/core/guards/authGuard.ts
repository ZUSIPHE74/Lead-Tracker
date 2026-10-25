import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, signOut } from '@angular/fire/auth';
import { RoleService } from '../services/role.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);
  const roleService = inject(RoleService);

  await auth.authStateReady();
  if (!auth.currentUser) {
    return router.createUrlTree(['/login']);
  }

  // A Firebase session alone is not access: the API must confirm the account
  // (invited, demo accounts enabled). Shared with the login check, so usually instant.
  if (await roleService.fetchProfile()) {
    return true;
  }

  await signOut(auth);
  return router.createUrlTree(['/login']);
};
