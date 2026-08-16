/**
 * roles.service.ts
 * Roles CRUD ke liye API service.
 * Backend ke /roles endpoints se communicate karta hai.
 */

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, catchError, EMPTY } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Role, ApiResponse } from '../../core/models/auth.models';

/** Role create/update ke liye request body */
export interface RoleFormData {
  name: string;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RolesService {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  // Roles list signal — RolesList component yahan se data leta hai
  roles = signal<Role[]>([]);
  isLoading = signal<boolean>(false);

  /** Sab roles fetch karta hai — GET /api/v1/roles */
  loadRoles() {
    this.isLoading.set(true);
    return this.http.get<ApiResponse<Role[]>>(`${this.apiUrl}/roles`).pipe(
      tap(response => {
        if (response.success) {
          this.roles.set(response.data);
        }
        this.isLoading.set(false);
      }),
      catchError(() => {
        this.isLoading.set(false);
        return EMPTY;
      })
    );
  }

  /** Naya role banata hai — POST /api/v1/roles */
  createRole(data: RoleFormData) {
    return this.http.post<ApiResponse<Role>>(`${this.apiUrl}/roles`, data);
  }

  /** Role update karta hai — PATCH /api/v1/roles/:id */
  updateRole(id: number, data: Partial<RoleFormData>) {
    return this.http.patch<ApiResponse<Role>>(`${this.apiUrl}/roles/${id}`, data);
  }

  /** Ek specific role fetch karta hai — GET /api/v1/roles/:id */
  getRoleById(id: number) {
    return this.http.get<ApiResponse<Role>>(`${this.apiUrl}/roles/${id}`);
  }
}
