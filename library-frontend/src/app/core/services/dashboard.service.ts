/**
 * dashboard.service.ts
 * Core service for Library Admin & Staff Dashboard metrics.
 * Fetches tenant-isolated operational KPIs from backend using Angular Signals.
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, catchError, EMPTY, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';
import { ToastService } from './toast.service';

/** Interface matching backend `GET /api/v1/reports/dashboard` response structure */
export interface LibraryDashboardMetrics {
  total_students: number;
  total_seats: number;
  active_bookings: number;
  occupancy_rate: number;
  today_check_ins: number;
  revenue_this_month: number;
  outstanding_dues: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private apiUrl = environment.apiUrl;

  /** Signal holding current dashboard metrics */
  public metrics = signal<LibraryDashboardMetrics | null>(null);

  /** Signal tracking loading state */
  public isLoading = signal<boolean>(false);

  /**
   * Fetch live library admin dashboard metrics.
   */
  loadDashboardMetrics(): Observable<ApiResponse<LibraryDashboardMetrics>> {
    this.isLoading.set(true);
    return this.http.get<ApiResponse<LibraryDashboardMetrics>>(`${this.apiUrl}/reports/dashboard`).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.metrics.set(response.data);
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to load dashboard metrics');
        return EMPTY;
      })
    );
  }
}
