/**
 * reports.service.ts
 * Core service for Reports & Analytics.
 * Connects to NestJS `/api/v1/reports` endpoints for high-level dashboard metrics, revenue analytics,
 * and attendance summary data.
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { tap, catchError, EMPTY, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';
import { ToastService } from './toast.service';

export interface DashboardMetrics {
  total_students: number;
  total_seats: number;
  occupied_seats: number;
  available_seats: number;
  active_bookings: number;
  today_checkins: number;
  monthly_revenue: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private apiUrl = environment.apiUrl;

  /** Signal holding dashboard high-level metrics */
  public metrics = signal<DashboardMetrics | null>(null);

  /** Signal holding revenue data */
  public revenueData = signal<any>(null);

  /** Signal holding attendance report data */
  public attendanceData = signal<any>(null);

  /** Signal tracking loading state */
  public isLoading = signal<boolean>(false);

  /** Fetch high level dashboard metrics */
  loadDashboardMetrics(): Observable<ApiResponse<DashboardMetrics>> {
    this.isLoading.set(true);
    return this.http.get<ApiResponse<DashboardMetrics>>(`${this.apiUrl}/reports/dashboard`).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.metrics.set(response.data);
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to load report metrics');
        return EMPTY;
      })
    );
  }

  /** Fetch revenue analytics report */
  loadRevenueReport(startDate?: string, endDate?: string): Observable<ApiResponse<any>> {
    this.isLoading.set(true);
    let params = new HttpParams();
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);

    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/reports/revenue`, { params }).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.revenueData.set(response.data);
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to load revenue report');
        return EMPTY;
      })
    );
  }

  /** Fetch attendance analytics report */
  loadAttendanceReport(startDate?: string, endDate?: string): Observable<ApiResponse<any>> {
    this.isLoading.set(true);
    let params = new HttpParams();
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);

    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/reports/attendance`, { params }).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.attendanceData.set(response.data);
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to load attendance report');
        return EMPTY;
      })
    );
  }
}
