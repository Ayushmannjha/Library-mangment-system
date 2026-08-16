/**
 * users.service.ts
 * Core service for Staff & User Management in Library Admin / Super Admin context.
 * Handles listing, creation, status toggles, and role assignment using Angular Signals.
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, catchError, EMPTY, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';
import { ToastService } from './toast.service';

/** User model returned from backend `GET /api/v1/users` */
export interface AppUser {
  id: string;
  first_name: string;
  last_name?: string | null;
  email: string | null;
  phone?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  library_id?: string | null;
  roles: string[];
  last_login_at?: string | null;
  created_at?: string;
}

/** DTO payload required to create a new staff user */
export interface CreateUserPayload {
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  password: string;
  roleCodes: string[];
}

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private apiUrl = environment.apiUrl;

  /** Signal holding current list of users */
  public users = signal<AppUser[]>([]);

  /** Signal tracking total user count */
  public totalUsers = signal<number>(0);

  /** Signal tracking loading state */
  public isLoading = signal<boolean>(false);

  /**
   * Fetch all users in the current library context.
   */
  loadUsers(): Observable<ApiResponse<AppUser[]>> {
    this.isLoading.set(true);
    return this.http.get<ApiResponse<AppUser[]>>(`${this.apiUrl}/users`).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.users.set(response.data);
          this.totalUsers.set(response.meta?.['total'] as number ?? response.data.length);
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to load users list');
        return EMPTY;
      })
    );
  }

  /**
   * Create a new staff/admin user and assign roles.
   */
  createUser(payload: CreateUserPayload): Observable<ApiResponse<AppUser>> {
    this.isLoading.set(true);
    return this.http.post<ApiResponse<AppUser>>(`${this.apiUrl}/users`, payload).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.toastService.showSuccess(`User "${response.data.first_name}" created successfully!`);
          this.loadUsers().subscribe();
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to create user');
        return EMPTY;
      })
    );
  }

  /**
   * Update a user's status (`ACTIVE` or `INACTIVE`).
   */
  updateUserStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): Observable<ApiResponse<AppUser>> {
    this.isLoading.set(true);
    return this.http.patch<ApiResponse<AppUser>>(`${this.apiUrl}/users/${id}/status`, { status }).pipe(
      tap((response) => {
        if (response.success) {
          this.toastService.showSuccess(`User status updated to ${status}`);
          this.loadUsers().subscribe();
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to update user status');
        return EMPTY;
      })
    );
  }

  /**
   * Assign new roles to a user.
   */
  assignRoles(id: string, roleCodes: string[]): Observable<ApiResponse<AppUser>> {
    this.isLoading.set(true);
    return this.http.put<ApiResponse<AppUser>>(`${this.apiUrl}/users/${id}/roles`, { roleCodes }).pipe(
      tap((response) => {
        if (response.success) {
          this.toastService.showSuccess('User roles updated successfully');
          this.loadUsers().subscribe();
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to update user roles');
        return EMPTY;
      })
    );
  }
}
