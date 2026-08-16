/**
 * auth.guard.ts
 * Route protection ke liye guard.
 * Agar user logged in nahi hai toh /login par redirect kar deta hai.
 * Angular 17+ ka functional guard pattern use kiya gaya hai.
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * authGuard: Har protected route par lagao.
 * Token check karta hai — nahi mila toh /login par bhejta hai.
 *
 * Usage in routes:
 * { path: 'dashboard', canActivate: [authGuard], component: DashboardComponent }
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Token localStorage mein hai — user logged in maana jaayega
  if (authService.getAccessToken()) {
    return true;
  }

  // Token nahi — login page par bhejo
  // returnUrl store karo taaki login ke baad same page par wapas aa sakein
  router.navigate(['/login'], {
    queryParams: { returnUrl: state.url }
  });
  return false;
};
