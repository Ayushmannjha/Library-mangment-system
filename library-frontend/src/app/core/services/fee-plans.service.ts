/**
 * fee-plans.service.ts
 * Core service for Fee Plan Management in Library Admin / Staff context.
 * Handles listing, creating, editing, and soft deleting fee plans using Angular Signals.
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { tap, catchError, EMPTY, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';
import { ToastService } from './toast.service';

/** Fee plan entity structure returned from backend `GET /api/v1/fee-plans` */
export interface FeePlan {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  amount: number;
  currency: string;
  billing_cycle: string;
  duration_days?: number | null;
  time_slot_id?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
}

/** DTO payload required to create a new fee plan */
export interface CreateFeePlanPayload {
  name: string;
  code: string;
  description?: string;
  amount: number;
  currency?: string;
  billing_cycle?: string;
  duration_days?: number;
  time_slot_id?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FeePlansService {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private apiUrl = environment.apiUrl;

  /** Signal holding current list of fee plans */
  public feePlans = signal<FeePlan[]>([]);

  /** Signal tracking total count of fee plans */
  public totalFeePlans = signal<number>(0);

  /** Signal tracking loading state */
  public isLoading = signal<boolean>(false);

  /**
   * Fetch all fee plans for the current library tenant.
   */
  loadFeePlans(includeInactive = true): Observable<ApiResponse<FeePlan[]>> {
    this.isLoading.set(true);
    const params = new HttpParams().set('includeInactive', includeInactive.toString());

    return this.http.get<ApiResponse<FeePlan[]>>(`${this.apiUrl}/fee-plans`, { params }).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.feePlans.set(response.data);
          this.totalFeePlans.set(response.meta?.['total'] as number ?? response.data.length);
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to load fee plans');
        return EMPTY;
      })
    );
  }

  /**
   * Create a new fee plan.
   */
  createFeePlan(payload: CreateFeePlanPayload): Observable<ApiResponse<FeePlan>> {
    this.isLoading.set(true);
    return this.http.post<ApiResponse<FeePlan>>(`${this.apiUrl}/fee-plans`, payload).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.toastService.showSuccess(`Fee plan "${response.data.name}" created!`);
          this.loadFeePlans().subscribe();
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to create fee plan');
        return EMPTY;
      })
    );
  }

  /**
   * Update fee plan details.
   */
  updateFeePlan(id: string, payload: Partial<CreateFeePlanPayload>): Observable<ApiResponse<FeePlan>> {
    this.isLoading.set(true);
    return this.http.patch<ApiResponse<FeePlan>>(`${this.apiUrl}/fee-plans/${id}`, payload).pipe(
      tap((response) => {
        if (response.success) {
          this.toastService.showSuccess('Fee plan updated successfully');
          this.loadFeePlans().subscribe();
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to update fee plan');
        return EMPTY;
      })
    );
  }

  /**
   * Soft delete / deactivate fee plan.
   */
  deleteFeePlan(id: string): Observable<ApiResponse<FeePlan>> {
    this.isLoading.set(true);
    return this.http.delete<ApiResponse<FeePlan>>(`${this.apiUrl}/fee-plans/${id}`).pipe(
      tap((response) => {
        if (response.success) {
          this.toastService.showSuccess('Fee plan deactivated successfully');
          this.loadFeePlans().subscribe();
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to deactivate fee plan');
        return EMPTY;
      })
    );
  }
}
