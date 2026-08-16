/**
 * subscriptions.service.ts
 * Core service for SaaS Subscriptions Management.
 * Handles fetching global platform pricing plans, checking current library subscription status,
 * activating trial subscriptions, and creating new SaaS plans (Super Admin context).
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
    return this.http.post<ApiResponse<SubscriptionPlan>>(`${this.apiUrl}/subscriptions/plans`, payload).pipe(
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
}
