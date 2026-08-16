import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

/**
 * Auth Interceptor — attaches JWT Bearer token and handles 401 globally.
 *
 * IMPORTANT: Only triggers on 401 Unauthorized.
 * All other errors (404, 500, 429, etc.) pass through untouched so that
 * individual service error-handlers can deal with them.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);

  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Only act on 401 — clear everything and redirect
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);

        // Avoid redirect loops: only navigate if not already on a public page
        const currentUrl = router.url;
        const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password'];
        if (!publicPaths.some(p => currentUrl.startsWith(p))) {
          router.navigate(['/login']);
        }
      }
      return throwError(() => error);
    })
  );
};
