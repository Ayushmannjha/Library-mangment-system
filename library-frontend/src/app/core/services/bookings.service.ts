/**
 * bookings.service.ts
 * Core service for Seat Booking & Allocation in Library Admin / Staff context.
 * Handles listing bookings, allocating seats, cancelling bookings using Angular Signals.
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { tap, catchError, EMPTY, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';
import { ToastService } from './toast.service';

/** Booking entity structure returned from backend `GET /api/v1/seat-bookings` */
export interface SeatBooking {
  id: string;
  student_id: string;
  seat_id: string;
  time_slot_id: string;
  booking_date: string;
  status: 'BOOKED' | 'CANCELLED' | 'EXPIRED';
  notes?: string | null;
  created_at?: string;
  student_name?: string;
  seat_number?: string;
  slot_name?: string;
}

/** DTO payload required to create a new seat booking */
export interface CreateSeatBookingPayload {
  student_id: string;
  seat_id: string;
  time_slot_id: string;
  booking_date: string; // YYYY-MM-DD
}

@Injectable({
  providedIn: 'root'
})
export class BookingsService {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private apiUrl = environment.apiUrl;

  /** Signal holding current list of seat bookings */
  public bookings = signal<SeatBooking[]>([]);

  /** Signal tracking total count of bookings */
  public totalBookings = signal<number>(0);

  /** Signal tracking current page index */
  public currentPage = signal<number>(1);

  /** Signal tracking page limit */
  public pageLimit = signal<number>(10);

  /** Signal tracking loading state */
  public isLoading = signal<boolean>(false);

  /**
   * Fetch all seat bookings for the current library tenant.
   */
  loadBookings(status = '', date = '', page = 1, limit = 10): Observable<ApiResponse<SeatBooking[]>> {
    this.isLoading.set(true);
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (status.trim()) params = params.set('status', status.trim());
    if (date.trim()) params = params.set('date', date.trim());

    return this.http.get<ApiResponse<SeatBooking[]>>(`${this.apiUrl}/seat-bookings`, { params }).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.bookings.set(response.data);
          this.totalBookings.set(response.meta?.['total'] as number ?? response.data.length);
          this.currentPage.set(page);
          this.pageLimit.set(limit);
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to load bookings');
        return EMPTY;
      })
    );
  }

  /**
   * Create a new seat allocation / booking.
   */
  createBooking(payload: CreateSeatBookingPayload): Observable<ApiResponse<SeatBooking>> {
    this.isLoading.set(true);
    return this.http.post<ApiResponse<SeatBooking>>(`${this.apiUrl}/seat-bookings`, payload).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.toastService.showSuccess('Seat booked successfully!');
          this.loadBookings('', '', this.currentPage(), this.pageLimit()).subscribe();
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to create booking');
        return EMPTY;
      })
    );
  }

  /**
   * Cancel an existing seat booking.
   */
  cancelBooking(id: string, notes = 'Cancelled by admin'): Observable<ApiResponse<SeatBooking>> {
    this.isLoading.set(true);
    return this.http.patch<ApiResponse<SeatBooking>>(`${this.apiUrl}/seat-bookings/${id}/cancel`, { notes }).pipe(
      tap((response) => {
        if (response.success) {
          this.toastService.showSuccess('Booking cancelled successfully');
          this.loadBookings('', '', this.currentPage(), this.pageLimit()).subscribe();
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to cancel booking');
        return EMPTY;
      })
    );
  }
}
