/**
 * libraries.service.ts
 * Core service for Super Admin Library Management.
 * Manages fetching library lists, transactional creation of library + owner,
 * updates, and soft deletion (status toggling) using Angular Signals.
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, catchError, EMPTY, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';
import { ToastService } from './toast.service';

/** Library entity structure returned from backend API */
export interface LibraryItem {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  phone?: string | null;
  email?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at?: string;
}

/** DTO payload required to create a new library along with its admin owner */
export interface CreateLibraryPayload {
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  owner_first_name: string;
  owner_last_name?: string;
  owner_email: string;
  owner_password: string;
}

@Injectable({
  providedIn: 'root'
})
export class LibrariesService {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private apiUrl = environment.apiUrl;

  /** Signal holding the current list of libraries */
  public libraries = signal<LibraryItem[]>([]);

  /** Signal tracking total libraries count for pagination */
  public totalLibraries = signal<number>(0);

  /** Signal tracking API loading status */
  public isLoading = signal<boolean>(false);

  /**
   * Load all libraries from backend (Super Admin authorized).
   * Updates `libraries` and `totalLibraries` signals.
   */
  loadLibraries(): Observable<ApiResponse<LibraryItem[]>> {
    this.isLoading.set(true);
    return this.http.get<ApiResponse<LibraryItem[]>>(`${this.apiUrl}/libraries`).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.libraries.set(response.data);
          this.totalLibraries.set(response.meta?.['total'] as number ?? response.data.length);
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to load libraries list');
        return EMPTY;
      })
    );
  }

  /**
   * Create a new library tenant along with its owner user account.
   */
  createLibrary(payload: CreateLibraryPayload): Observable<ApiResponse<LibraryItem>> {
    this.isLoading.set(true);
    return this.http.post<ApiResponse<LibraryItem>>(`${this.apiUrl}/libraries`, payload).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.toastService.showSuccess(`Library "${response.data.name}" created successfully!`);
          // Reload the updated list
          this.loadLibraries().subscribe();
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to create library');
        return EMPTY;
      })
    );
  }

  /**
   * Partially update a library's attributes (e.g. name, city, phone).
   */
  updateLibrary(id: string, payload: Partial<CreateLibraryPayload>): Observable<ApiResponse<LibraryItem>> {
    this.isLoading.set(true);
    return this.http.patch<ApiResponse<LibraryItem>>(`${this.apiUrl}/libraries/${id}`, payload).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.toastService.showSuccess(`Library "${response.data.name}" updated successfully!`);
          this.loadLibraries().subscribe();
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to update library');
        return EMPTY;
      })
    );
  }

  /**
   * Soft delete / deactivate a library (sets status = INACTIVE).
   */
  deactivateLibrary(id: string): Observable<ApiResponse<LibraryItem>> {
    this.isLoading.set(true);
    return this.http.delete<ApiResponse<LibraryItem>>(`${this.apiUrl}/libraries/${id}`).pipe(
      tap((response) => {
        if (response.success) {
          this.toastService.showSuccess('Library deactivated successfully!');
          this.loadLibraries().subscribe();
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to deactivate library');
        return EMPTY;
      })
    );
  }
}
