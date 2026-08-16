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

/** Library owner user shown on the admin library-detail page */
export interface LibraryOwner {
  id: string;
  first_name: string;
  last_name?: string | null;
  email: string;
  phone?: string | null;
  status: string;
  roles: string[];
}

/** Plan summary embedded in a library subscription view */
export interface LibraryPlanView {
  id: string;
  code: string;
  name: string;
  price: number;
  currency: string;
  billing_cycle: string;
}

/** Library subscription as returned by /libraries/:id/admin-detail */
export interface LibrarySubscriptionView {
  id: string;
  plan_id: string;
  status: string;
  days_left: number | null;
  trial_start_at?: string | null;
  trial_end_at?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  price: number;
  currency: string;
  plan: LibraryPlanView;
}

/** Full admin detail payload for a single library */
export interface LibraryDetail {
  library: LibraryItem;
  owner: LibraryOwner | null;
  subscription: LibrarySubscriptionView | null;
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

  /** Signal holding the admin detail of the currently viewed library */
  public libraryDetail = signal<LibraryDetail | null>(null);

  /** Signal tracking API loading status */
  public isLoading = signal<boolean>(false);

  /**
   * Load all libraries from backend (Super Admin authorized).
   * When `includeInactive` is true, INACTIVE libraries are returned too so
   * the admin can re-activate them.
   * Updates `libraries` and `totalLibraries` signals.
   */
  loadLibraries(includeInactive = false): Observable<ApiResponse<LibraryItem[]>> {
    this.isLoading.set(true);
    const suffix = includeInactive ? '?include_inactive=true' : '';
    return this.http.get<ApiResponse<LibraryItem[]>>(`${this.apiUrl}/libraries${suffix}`).pipe(
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
   * Load the admin detail for one library: library row (any status), its
   * owner user and the current subscription with expiry info.
   */
  loadLibraryDetail(id: string): Observable<ApiResponse<LibraryDetail>> {
    this.isLoading.set(true);
    return this.http.get<ApiResponse<LibraryDetail>>(`${this.apiUrl}/libraries/${id}/admin-detail`).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.libraryDetail.set(response.data);
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to load library details');
        return EMPTY;
      })
    );
  }

  /**
   * Activate / deactivate a library (status toggle, Super Admin only).
   */
  updateLibraryStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): Observable<ApiResponse<LibraryItem>> {
    this.isLoading.set(true);
    return this.http.patch<ApiResponse<LibraryItem>>(`${this.apiUrl}/libraries/${id}/status`, { status }).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.toastService.showSuccess(
            `Library "${response.data.name}" ${status === 'ACTIVE' ? 'activated' : 'deactivated'} successfully!`
          );
          this.loadLibraries(true).subscribe();
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || `Failed to ${status === 'ACTIVE' ? 'activate' : 'deactivate'} library`);
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
