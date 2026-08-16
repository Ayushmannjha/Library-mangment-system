/**
 * student.service.ts
 * Student Portal ki central service.
 * Backend endpoints (self-scoped via JWT):
 *   GET  /api/v1/student/me
 *   GET  /api/v1/student/attendance   (history — token required)
 *   POST /api/v1/student/attendance   (check-in — token required, no body)
 *   GET  /api/v1/student/seat
 *   GET  /api/v1/student/fees
 *
 * The desk QR code only points to the PUBLIC landing page
 * (GET /api/v1/attendance/qr) — it carries no identity. All student data comes
 * from the JWT on the endpoints above.
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, catchError, EMPTY, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';
import {
  MyProfile,
  AttendanceRecord,
  SeatBooking,
  StudentInvoice,
} from '../models/student.models';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private apiUrl = environment.apiUrl;

  // ===== Reactive State =====

  /** GET /student/me */
  profile = signal<MyProfile | null>(null);

  /** GET /student/attendance */
  attendance = signal<AttendanceRecord[]>([]);

  /** GET /student/seat */
  seat = signal<SeatBooking | null>(null);

  /** GET /student/fees */
  invoices = signal<StudentInvoice[]>([]);

  /** Loading state for any request */
  isLoading = signal<boolean>(false);

  // ===== Methods =====

  /** Load my student profile + linked account. */
  loadProfile(): Observable<ApiResponse<MyProfile>> {
    this.isLoading.set(true);
    return this.http.get<ApiResponse<MyProfile>>(`${this.apiUrl}/student/me`).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.profile.set(response.data);
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to load profile');
        return EMPTY;
      })
    );
  }

  /**
   * Confirm attendance for the logged-in student.
   * No request body — identity comes from the JWT, never from the QR code.
   */
  checkIn(): Observable<ApiResponse<AttendanceRecord>> {
    this.isLoading.set(true);
    return this.http.post<ApiResponse<AttendanceRecord>>(
      `${this.apiUrl}/student/attendance`,
      {}
    ).pipe(
      tap((response) => {
        if (response.success) {
          this.toastService.showSuccess('Checked in successfully! Welcome to the library.');
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Check-in failed');
        return EMPTY;
      })
    );
  }

  /** Load my attendance history (newest first). */
  loadAttendance(): Observable<ApiResponse<AttendanceRecord[]>> {
    this.isLoading.set(true);
    return this.http.get<ApiResponse<AttendanceRecord[]>>(`${this.apiUrl}/student/attendance`).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.attendance.set(response.data);
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to load attendance');
        return EMPTY;
      })
    );
  }

  /** Load my current/latest seat allocation. */
  loadSeat(): Observable<ApiResponse<SeatBooking | null>> {
    this.isLoading.set(true);
    return this.http.get<ApiResponse<SeatBooking | null>>(`${this.apiUrl}/student/seat`).pipe(
      tap((response) => {
        if (response.success) {
          this.seat.set(response.data ?? null);
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to load seat');
        return EMPTY;
      })
    );
  }

  /** Load my invoices and payments. */
  loadFees(): Observable<ApiResponse<StudentInvoice[]>> {
    this.isLoading.set(true);
    return this.http.get<ApiResponse<StudentInvoice[]>>(`${this.apiUrl}/student/fees`).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.invoices.set(response.data);
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to load fees');
        return EMPTY;
      })
    );
  }
}
