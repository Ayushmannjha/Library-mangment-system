/**
 * role.guard.ts
 * Role-based route protection ke liye guard.
 * Sirf specific roles wale users hi kuch routes access kar sakte hain.
 * Agar role match nahi kiya toh /unauthorized par redirect.
 *
 * Usage in routes:
 * {
 *   path: 'super-admin',
 *   canActivate: [authGuard, roleGuard],
 *   data: { roles: ['SUPER_ADMIN'] },
 *   ...
 * }
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { RoleName } from '../models/auth.models';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Route ke `data.roles` array se allowed roles lo
  const allowedRoles: RoleName[] = route.data['roles'] ?? [];

  // Agar koi role restriction nahi toh allow karo
  if (allowedRoles.length === 0) return true;

  // User ke saare roles allowed roles se match karo (kisi bhi role se allow)
  const userRoles: RoleName[] = authService.currentUser()?.roles ?? [];

  if (userRoles.some(role => allowedRoles.includes(role))) {
    return true;
  }

  // Role match nahi — unauthorized page par bhejo
  router.navigate(['/unauthorized']);
  return false;
};
