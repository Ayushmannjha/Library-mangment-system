/**
 * time-slots.service.ts
 * Core service for Time Slot Management in Library Admin / Staff context.
 * Handles listing, creating, and updating custom library operational time slots using Angular Signals.
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, catchError, EMPTY, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';
import { ToastService } from './toast.service';

/** Time slot entity structure returned from backend `GET /api/v1/time-slots` */
export interface TimeSlot {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  description?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
}

/** DTO payload required to create a new time slot */
export interface CreateTimeSlotPayload {
  name: string;
  start_time: string; // HH:mm:ss
  end_time: string;   // HH:mm:ss
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TimeSlotsService {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private apiUrl = environment.apiUrl;

  /** Signal holding current list of time slots */
  public slots = signal<TimeSlot[]>([]);

  /** Signal tracking total count of slots */
  public totalSlots = signal<number>(0);

  /** Signal tracking loading state */
  public isLoading = signal<boolean>(false);

  /**
   * Fetch all time slots for the current library tenant.
   */
  loadSlots(): Observable<ApiResponse<TimeSlot[]>> {
    this.isLoading.set(true);
    return this.http.get<ApiResponse<TimeSlot[]>>(`${this.apiUrl}/time-slots`).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.slots.set(response.data);
          this.totalSlots.set(response.meta?.['total'] as number ?? response.data.length);
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to load time slots');
        return EMPTY;
      })
    );
  }

  /**
   * Create a new time slot.
   */
  createSlot(payload: CreateTimeSlotPayload): Observable<ApiResponse<TimeSlot>> {
    this.isLoading.set(true);
    return this.http.post<ApiResponse<TimeSlot>>(`${this.apiUrl}/time-slots`, payload).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.toastService.showSuccess(`Time slot "${response.data.name}" created!`);
          this.loadSlots().subscribe();
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to create time slot');
        return EMPTY;
      })
    );
  }

  /**
   * Update time slot details or status.
   */
  updateSlot(id: string, payload: Partial<CreateTimeSlotPayload> & { status?: string }): Observable<ApiResponse<TimeSlot>> {
    this.isLoading.set(true);
    return this.http.patch<ApiResponse<TimeSlot>>(`${this.apiUrl}/time-slots/${id}`, payload).pipe(
      tap((response) => {
        if (response.success) {
          this.toastService.showSuccess('Time slot updated successfully');
          this.loadSlots().subscribe();
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to update time slot');
        return EMPTY;
      })
    );
  }
}
