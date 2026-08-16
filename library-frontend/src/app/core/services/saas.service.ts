/**
 * saas.service.ts
 * Super Admin Dashboard ke metrics fetch karne ke liye service.
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, EMPTY, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';

export interface SaasMetrics {
  kpis: {
    totalLibraries: number;
    activeLibraries: number;
    inactiveLibraries: number;
    trialLibraries: number;
    paidLibraries: number;
    subscriptionRevenue: number;
  };
  recentLibraries: {
    id: string;
    name: string;
    status: string;
    created_at: string;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class SaasService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  metrics = signal<SaasMetrics | null>(null);
  isLoading = signal<boolean>(false);

  loadDashboardMetrics() {
    this.isLoading.set(true);
    return this.http.get<ApiResponse<SaasMetrics>>(`${this.apiUrl}/reports/saas-dashboard`).pipe(
      tap(response => {
        if (response.success) {
          this.metrics.set(response.data);
        }
        this.isLoading.set(false);
      }),
      catchError(() => {
        this.isLoading.set(false);
        return EMPTY;
      })
    );
  }
}
