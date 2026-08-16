/**
 * permissions.service.ts
 * Permission management ke liye central service.
 * Roles aur permissions backend se fetch karta hai.
 * Current user ke permissions check karne ka method provide karta hai.
 */

import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, catchError, EMPTY } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Permission, Role, ApiResponse } from '../models/auth.models';

@Injectable({
  providedIn: 'root' // Singleton service — ek hi instance
})
export class PermissionsService {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  // ===== Reactive State =====

  /** Sab available permissions (system-wide) */
  allPermissions = signal<Permission[]>([]);

  /** Sab available roles */
  allRoles = signal<Role[]>([]);

  /**
   * Current logged-in user ke permission names ka Set.
   * AuthService ke currentUser se populate hota hai.
   * hasPermission() is Set ko use karta hai fast O(1) lookup ke liye.
   */
  private _userPermissions = signal<Set<string>>(new Set());

  // ===== Public Methods =====

  /**
   * Current user ke liye permissions Set set karta hai.
   * AuthService login ke baad is method ko call karta hai.
   */
  setUserPermissions(permissions: string[]) {
    this._userPermissions.set(new Set(permissions));
  }

  /**
   * Check karta hai ki current user ke paas ek specific permission hai ya nahi.
   * Templates mein *appHasPermission directive isko use karta hai.
   * SUPER_ADMIN ko sab permissions milti hain by default.
   */
  hasPermission(permissionName: string): boolean {
    return this._userPermissions().has(permissionName);
  }

  /** Sab system permissions backend se fetch karta hai */
  loadAllPermissions() {
    return this.http.get<ApiResponse<Permission[]>>(`${this.apiUrl}/permissions`).pipe(
      tap(response => {
        if (response.success) {
          this.allPermissions.set(response.data);
        }
      }),
      catchError(() => EMPTY)
    );
  }

  /** Sab roles backend se fetch karta hai */
  loadAllRoles() {
    return this.http.get<ApiResponse<Role[]>>(`${this.apiUrl}/roles`).pipe(
      tap(response => {
        if (response.success) {
          this.allRoles.set(response.data);
        }
      }),
      catchError(() => EMPTY)
    );
  }

  /**
   * Ek specific role ki permissions backend se fetch karta hai.
   * Roles edit form mein use hota hai.
   */
  getRolePermissions(roleId: number) {
    return this.http.get<ApiResponse<Permission[]>>(
      `${this.apiUrl}/roles/${roleId}/permissions`
    );
  }

  /**
   * Ek role ki permissions update karta hai.
   * Permission matrix save button par use hota hai.
   */
  updateRolePermissions(roleId: number, permissionIds: number[]) {
    return this.http.put<ApiResponse<any>>(
      `${this.apiUrl}/roles/${roleId}/permissions`,
      { permission_ids: permissionIds }
    );
  }
}
