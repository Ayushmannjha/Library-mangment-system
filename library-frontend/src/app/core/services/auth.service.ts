/**
 * auth.service.ts
 * Authentication ki sabse central service.
 * Yahan login, logout, token management, aur user profile sab handle hota hai.
 * Angular Signals use kiye hain taaki components reactively update ho sakein.
 */

import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, EMPTY } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  LoginRequest,
  LoginResponse,
  UserProfile,
  ApiResponse,
  RoleName
} from '../models/auth.models';
import { ToastService } from './toast.service';

/** LocalStorage mein token store karne ke liye key constants */
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

@Injectable({
  providedIn: 'root' // Root level pe provide — poori app mein ek hi instance
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private toastService = inject(ToastService);

  /** API base URL environment se liya gaya hai */
  private readonly apiUrl = environment.apiUrl;

  // ===== Reactive State using Angular Signals =====

  /** Current logged-in user ki profile (null = not logged in) */
  currentUser = signal<UserProfile | null>(null);

  /** Loading state — API call chal rahi hai ya nahi */
  isLoading = signal<boolean>(false);

  /**
   * Computed signal — sirf tab true hoga jab user logged in ho.
   * Components mein `authService.isLoggedIn()` se use karo.
   */
  isLoggedIn = computed(() => this.currentUser() !== null);

  /**
   * Computed signal — current user ki primary role return karta hai.
   * Route guards mein role-based access check ke liye use hota hai.
   */
  primaryRole = computed<RoleName | null>(() => {
    const user = this.currentUser();
    if (!user || !user.roles?.length) return null;
    return user.roles[0] ?? null;
  });

  /**
   * Computed signal — current user ki saari permissions ka Set.
   * `hasPermission()` method is Set ko use karta hai O(1) lookup ke liye.
   */
  private userPermissions = computed<Set<string>>(() => {
    const user = this.currentUser();
    if (!user || !user.roles?.length) return new Set();
    const perms = new Set<string>();
    // Har role ki har permission Set mein add karo
    user.roles.forEach(ur => {
      // Note: /me endpoint permissions bhi return kare toh yahan add hongi
      // Filhaal RBAC Phase 3 mein PermissionsService se integrate hoga
    });
    return perms;
  });

  // ===== Constructor: Session Restore =====

  constructor() {
    // App start hone par check karo ki token stored hai ya nahi.
    // Agar hai toh user ko dobara login nahi karna padega (session restore).
    this.tryRestoreSession();
  }

  // ===== Public Methods =====

  /**
   * User ko login karta hai.
   * Backend se token aata hai, localStorage mein store hota hai,
   * fir /me call se user profile load hoti hai, aur role ke hisab se redirect.
   */
  login(credentials: LoginRequest) {
    this.isLoading.set(true);

    return this.http.post<ApiResponse<LoginResponse>>(
      `${this.apiUrl}/auth/login`,
      credentials
    ).pipe(
      tap(response => {
        if (response.success && response.data) {
          const { accessToken, refreshToken, user } = response.data;

          // Tokens ko localStorage mein save karo
          this.storeTokens(accessToken, refreshToken);

          // User profile Signal update karo
          this.currentUser.set(user);

          this.isLoading.set(false);
          const displayName = user.first_name || (user as any).name || 'User';
          this.toastService.showSuccess(`Welcome back, ${displayName}!`);

          // Roles sirf /me se aati hain — redirect se pehle profile load karo
          this.loadCurrentUser().subscribe({
            next: () => {
              console.log('loadCurrentUser next called. User:', this.currentUser());
              this.redirectAfterLogin(this.currentUser());
            },
            error: (err) => {
              console.error('loadCurrentUser error:', err);
              this.router.navigate(['/dashboard']);
            },
            complete: () => {
              console.log('loadCurrentUser complete called');
              // Fallback just in case next was skipped (e.g. EMPTY was returned)
              if (!this.currentUser()?.roles) {
                this.router.navigate(['/dashboard']);
              }
            }
          });
        }
      }),
      catchError(error => {
        console.error('Login error:', error);
        this.isLoading.set(false);
        return EMPTY;
      })
    );
  }

  /**
   * User ko logout karta hai.
   * Token backend se revoke karta hai (agar available), local state clear karta hai.
   */
  logout() {
    const refreshToken = this.getRefreshToken();

    // Backend ko bhi batao ki session khatam hua (best effort)
    if (refreshToken) {
      this.http.post(`${this.apiUrl}/auth/logout`, { refresh_token: refreshToken })
        .subscribe({ error: () => {} }); // Error ignore karo, local cleanup zaroori hai
    }

    // Local state aur tokens clear karo
    this.clearSession();
    this.toastService.showSuccess('Logged out successfully.');
    this.router.navigate(['/login']);
  }

  /**
   * Backend se current user ki fresh profile fetch karta hai.
   * App start hone par ya profile update hone par call karo.
   */
  loadCurrentUser() {
    return this.http.get<ApiResponse<UserProfile>>(`${this.apiUrl}/auth/me`).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.currentUser.set(response.data);
        }
      }),
      catchError((err) => {
        console.error('/auth/me failed', err);
        // /me fail hone ka matlab token expire ho gaya ya backend reject kar raha hai
        this.clearSession();
        return EMPTY;
      })
    );
  }

  /**
   * Access token return karta hai — auth.interceptor isko use karta hai
   * har HTTP request ke Authorization header mein lagane ke liye.
   */
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  /** Refresh token return karta hai */
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  // ===== Private Helper Methods =====

  /**
   * App start hone par localStorage mein stored token check karta hai.
   * Token milne par /me API se user profile restore karta hai.
   */
  private tryRestoreSession() {
    const token = this.getAccessToken();
    if (token) {
      // Token hai — backend se fresh user profile lo
      this.loadCurrentUser().subscribe();
    }
  }

  /** Access aur refresh tokens ko localStorage mein save karta hai */
  private storeTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  /** Saare session data ko localStorage se hata ta hai */
  private clearSession() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    this.currentUser.set(null);
  }

  /**
   * Login ke baad user ki role dekh kar sahi dashboard par bheja jaata hai.
   * SUPER_ADMIN → /super-admin/dashboard
   * Baaki sab → /dashboard
   */
  private redirectAfterLogin(user: UserProfile | null) {
    // /me abhi tak load nahi hua ho toh bina role check default dashboard.
    if (user?.roles?.includes('SUPER_ADMIN')) {
      this.router.navigate(['/super-admin/dashboard']).then(success => {
        if (!success) console.error('Navigation to /super-admin/dashboard failed (guard blocked?)');
      }).catch(err => console.error('Router error:', err));
    } else {
      this.router.navigate(['/dashboard']).then(success => {
        if (!success) console.error('Navigation to /dashboard failed');
      }).catch(err => console.error('Router error:', err));
    }
  }
}
