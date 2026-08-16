// src/app/core/interceptors/auth.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

/**
 * Auth Interceptor (Functional)
 * Yeh interceptor har HTTP request ke saath JWT token attach karta hai (agar available ho).
 * Agar backend se 401 Unauthorized error aata hai, toh user ko login page par redirect kar deta hai.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  // LocalStorage se JWT access token nikalte hain
  const token = localStorage.getItem('access_token');
  
  // Nayi request clone karte hain
  let authReq = req;

  // Agar token hai, toh Authorization header set karte hain
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // Request ko aage bhejte hain aur errors ko handle karte hain
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Agar 401 (Unauthorized) error aata hai, matlab token expire ho gaya ya invalid hai
      if (error.status === 401) {
        // Local storage clear karke login page par bhej do
        localStorage.removeItem('access_token');
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
