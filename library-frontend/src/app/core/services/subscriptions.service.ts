/**
 * subscriptions.service.ts
 * Core service for SaaS Subscriptions Management.
 * Handles fetching global platform pricing plans, checking current library subscription status,
 * activating trial subscriptions, and creating new SaaS plans (Super Admin context).
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { tap, catchError, EMPTY, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';
import { ToastService } from './toast.service';

/** Platform Subscription Plan entity */
export interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  price: number;
  currency: string;
  billing_cycle: string;
  max_students?: number | null;
  max_seats?: number | null;
  max_users?: number | null;
  status: string;
}

/** Active Library Subscription entity */
export interface LibrarySubscription {
  id: string;
  library_id: string;
  plan_id: string;
  status: 'TRIALING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  trial_ends_at?: string | null;
  starts_at: string;
  ends_at?: string | null;
  plan?: SubscriptionPlan;
}

export interface CreateSubscriptionPlanPayload {
  name: string;
  code: string;
  description?: string;
  price: number;
  currency?: string;
  billing_cycle?: string;
  max_students?: number;
  max_seats?: number;
  max_users?: number;
}

/** Plan summary embedded in admin library-subscription rows */
export interface AdminPlanSummary {
  id: string;
  code: string;
  name: string;
  price: number;
  currency: string;
  billing_cycle: string;
}

/** Library summary embedded in admin library-subscription rows */
export interface AdminLibrarySummary {
  id: string;
  name: string;
  code: string;
  city?: string | null;
  status: string;
}

/** Admin view of one library subscription, with expiry information */
export interface LibrarySubscriptionAdminRow {
  id: string;
  library_id: string;
  plan_id: string;
  status: string;
  days_left: number | null;
  expiring_soon: boolean;
  trial_start_at?: string | null;
  trial_end_at?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  price: number;
  currency: string;
  created_at?: string;
  plan: AdminPlanSummary;
  library: AdminLibrarySummary;
}

/** Filters accepted by the admin library-subscriptions listing */
export interface LibrarySubscriptionFilters {
  status?: string;
  expiringSoon?: boolean;
  includeInactive?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SubscriptionsService {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private apiUrl = environment.apiUrl;

  /** Signal holding platform subscription plans */
  public plans = signal<SubscriptionPlan[]>([]);

  /** Signal holding active library subscription */
  public mySubscription = signal<LibrarySubscription | null>(null);

  /** Signal holding the admin view of all library subscriptions (expiry info) */
  public allSubscriptions = signal<LibrarySubscriptionAdminRow[]>([]);

  /** Signal tracking total library subscriptions for pagination */
  public allSubscriptionsTotal = signal<number>(0);

  /** Signal tracking loading state */
  public isLoading = signal<boolean>(false);

  /** Fetch global subscription plans */
  loadPlans(): Observable<ApiResponse<SubscriptionPlan[]>> {
    this.isLoading.set(true);
    return this.http.get<ApiResponse<SubscriptionPlan[]>>(`${this.apiUrl}/subscriptions/plans`).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.plans.set(response.data);
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to load subscription plans');
        return EMPTY;
      })
    );
  }

  /** Fetch current tenant library subscription */
  loadMySubscription(): Observable<ApiResponse<LibrarySubscription>> {
    this.isLoading.set(true);
    return this.http.get<ApiResponse<LibrarySubscription>>(`${this.apiUrl}/subscriptions/libraries/my`).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.mySubscription.set(response.data);
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        return EMPTY;
      })
    );
  }

  /** Activate trialing subscription */
  activateSubscription(): Observable<ApiResponse<LibrarySubscription>> {
    this.isLoading.set(true);
    return this.http.post<ApiResponse<LibrarySubscription>>(`${this.apiUrl}/subscriptions/libraries/my/activate`, {}).pipe(
      tap((response) => {
        if (response.success) {
          this.toastService.showSuccess('Subscription activated successfully!');
          this.loadMySubscription().subscribe();
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to activate subscription');
        return EMPTY;
      })
    );
  }

  /** Create a new global subscription plan (Super Admin) */
  createPlan(payload: CreateSubscriptionPlanPayload): Observable<ApiResponse<SubscriptionPlan>> {
    this.isLoading.set(true);
    // The backend DTO only accepts the fields below (forbidNonWhitelisted
    // rejects unknown keys such as max_students/max_seats/max_users).
    const body = {
      code: payload.code,
      name: payload.name,
      price: payload.price,
      ...(payload.description !== undefined && payload.description !== '' && { description: payload.description }),
      ...(payload.currency !== undefined && payload.currency !== '' && { currency: payload.currency }),
      ...(payload.billing_cycle !== undefined && payload.billing_cycle !== '' && { billing_cycle: payload.billing_cycle }),
    };
    return this.http.post<ApiResponse<SubscriptionPlan>>(`${this.apiUrl}/subscriptions/plans`, body).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.toastService.showSuccess(`Subscription plan "${response.data.name}" created!`);
          this.loadPlans().subscribe();
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to create subscription plan');
        return EMPTY;
      })
    );
  }

  /** Update a plan (name/description/price/billing/status) — Super Admin */
  updatePlan(id: string, payload: Partial<SubscriptionPlan>): Observable<ApiResponse<SubscriptionPlan>> {
    this.isLoading.set(true);
    return this.http.patch<ApiResponse<SubscriptionPlan>>(`${this.apiUrl}/subscriptions/plans/${id}`, payload).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.toastService.showSuccess(`Subscription plan "${response.data.name}" updated!`);
          this.loadPlans().subscribe();
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to update subscription plan');
        return EMPTY;
      })
    );
  }

  /**
   * Admin: load every library subscription with plan + expiry info.
   * Set expiringSoon=true to only return plans expiring within 7 days plus any
   * already-expired ones.
   */
  loadAllLibrarySubscriptions(filters: LibrarySubscriptionFilters = {}): Observable<ApiResponse<LibrarySubscriptionAdminRow[]>> {
    this.isLoading.set(true);
    let params = new HttpParams();
    if (filters.status) params = params.set('status', filters.status);
    if (filters.expiringSoon) params = params.set('expiring_soon', 'true');
    if (filters.includeInactive) params = params.set('include_inactive', 'true');

    return this.http.get<ApiResponse<LibrarySubscriptionAdminRow[]>>(`${this.apiUrl}/subscriptions/libraries`, { params }).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.allSubscriptions.set(response.data);
          this.allSubscriptionsTotal.set(response.meta?.['total'] as number ?? response.data.length);
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to load library subscriptions');
        return EMPTY;
      })
    );
  }

  /** Admin: switch an existing library subscription to a different plan */
  changeLibraryPlan(subscriptionId: string, planId: string): Observable<ApiResponse<LibrarySubscription>> {
    this.isLoading.set(true);
    return this.http.patch<ApiResponse<LibrarySubscription>>(`${this.apiUrl}/subscriptions/libraries/${subscriptionId}`, { plan_id: planId }).pipe(
      tap((response) => {
        if (response.success) {
          this.toastService.showSuccess('Library subscription plan changed successfully!');
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to change library subscription plan');
        return EMPTY;
      })
    );
  }
}
