/**
 * seats.service.ts
 * Core service for Seat Management in Library Admin / Staff context.
 * Handles listing seats, single seat creation, bulk seat generation, and updates using Angular Signals.
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { tap, catchError, EMPTY, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';
import { ToastService } from './toast.service';

export interface SlotBookingInfo {
  id: string;
  time_slot_id: string;
  student_id: string;
  student_name: string;
  admission_number?: string;
}

/** Seat entity structure returned from backend `GET /api/v1/seats` */
export interface Seat {
  id: string;
  seat_number: string;
  name?: string | null;
  description?: string | null;
  floor?: string | null;
  section?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'OCCUPIED';
  slot_bookings?: SlotBookingInfo[];
  created_at?: string;
}

/** DTO payload required to create a single seat */
export interface CreateSeatPayload {
  seat_number: string;
  name?: string;
  description?: string;
  floor?: string;
  section?: string;
}

/** DTO payload required to bulk generate sequential seats */
export interface BulkCreateSeatsPayload {
  prefix: string;
  start_number: number;
  count: number;
  floor?: string;
  section?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SeatsService {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private apiUrl = environment.apiUrl;

  /** Signal holding current list of seats */
  public seats = signal<Seat[]>([]);

  /** Signal tracking total count of seats */
  public totalSeats = signal<number>(0);

  /** Signal tracking loading state */
  public isLoading = signal<boolean>(false);

  /**
   * Load seats list with optional floor/section/date/timeSlotId filters.
   */
  loadSeats(floor = '', section = '', date = '', timeSlotId = ''): Observable<ApiResponse<Seat[]>> {
    this.isLoading.set(true);
    let params = new HttpParams().set('limit', '200'); // Load large batch for visual grid

    if (floor.trim()) params = params.set('floor', floor.trim());
    if (section.trim()) params = params.set('section', section.trim());
    if (date.trim()) params = params.set('date', date.trim());
    if (timeSlotId.trim() && timeSlotId !== 'all') params = params.set('time_slot_id', timeSlotId.trim());

    return this.http.get<ApiResponse<Seat[]>>(`${this.apiUrl}/seats`, { params }).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.seats.set(response.data);
          this.totalSeats.set(response.meta?.['total'] as number ?? response.data.length);
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to load seats');
        return EMPTY;
      })
    );
  }

  /**
   * Create a single seat.
   */
  createSeat(payload: CreateSeatPayload): Observable<ApiResponse<Seat>> {
    this.isLoading.set(true);
    return this.http.post<ApiResponse<Seat>>(`${this.apiUrl}/seats`, payload).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.toastService.showSuccess(`Seat "${response.data.seat_number}" created!`);
          this.loadSeats().subscribe();
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to create seat');
        return EMPTY;
      })
    );
  }

  /**
   * Bulk generate seats (e.g. S-1 to S-50).
   */
  bulkCreateSeats(payload: BulkCreateSeatsPayload): Observable<ApiResponse<{ count: number }>> {
    this.isLoading.set(true);
    return this.http.post<ApiResponse<{ count: number }>>(`${this.apiUrl}/seats/bulk`, payload).pipe(
      tap((response) => {
        if (response.success) {
          this.toastService.showSuccess(response.message || 'Seats bulk generated successfully!');
          this.loadSeats().subscribe();
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to bulk generate seats');
        return EMPTY;
      })
    );
  }

  /**
   * Update seat details or status.
   */
  updateSeat(id: string, payload: Partial<CreateSeatPayload> & { status?: string }): Observable<ApiResponse<Seat>> {
    this.isLoading.set(true);
    return this.http.patch<ApiResponse<Seat>>(`${this.apiUrl}/seats/${id}`, payload).pipe(
      tap((response) => {
        if (response.success) {
          this.toastService.showSuccess('Seat updated successfully');
          this.loadSeats().subscribe();
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to update seat');
        return EMPTY;
      })
    );
  }
}
