/**
 * attendance.service.ts
 * Core service for Attendance & Check-in Management in Library Admin / Staff context.
 * Handles listing attendance logs, student check-in, and student check-out using Angular Signals.
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { tap, catchError, EMPTY, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';
import { ToastService } from './toast.service';

/** Attendance log entity structure returned from backend `GET /api/v1/attendance` */
export interface AttendanceRecord {
  id: string;
  student_id: string;
  booking_id?: string | null;
  attendance_date: string;
  check_in_at: string;
  check_out_at?: string | null;
  check_in_method: string;
  qr_token?: string | null;
  remarks?: string | null;
  attendance_status: string;
  created_at?: string;
}

/** DTO payload required to check in a student */
export interface CheckInPayload {
  student_id: string;
  booking_id?: string;
  check_in_method?: 'MANUAL' | 'QR_CODE';
  qr_token?: string;
  remarks?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private apiUrl = environment.apiUrl;

  /** Signal holding current list of attendance records */
  public records = signal<AttendanceRecord[]>([]);

  /** Signal tracking total count of records */
  public totalRecords = signal<number>(0);

  /** Signal tracking current page index */
  public currentPage = signal<number>(1);

  /** Signal tracking page limit */
  public pageLimit = signal<number>(10);

  /** Signal tracking loading state */
  public isLoading = signal<boolean>(false);

  /**
   * Load attendance records with optional date or student filtering.
   */
  loadAttendance(date = '', studentId = '', page = 1, limit = 10): Observable<ApiResponse<AttendanceRecord[]>> {
    this.isLoading.set(true);
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (date.trim()) params = params.set('date', date.trim());
    if (studentId.trim()) params = params.set('student_id', studentId.trim());

    return this.http.get<ApiResponse<AttendanceRecord[]>>(`${this.apiUrl}/attendance`, { params }).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.records.set(response.data);
          this.totalRecords.set(response.meta?.['total'] as number ?? response.data.length);
          this.currentPage.set(page);
          this.pageLimit.set(limit);
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to load attendance records');
        return EMPTY;
      })
    );
  }

  /**
   * Check in a student.
   */
  checkIn(payload: CheckInPayload): Observable<ApiResponse<AttendanceRecord>> {
    this.isLoading.set(true);
    return this.http.post<ApiResponse<AttendanceRecord>>(`${this.apiUrl}/attendance/check-in`, payload).pipe(
      tap((response) => {
        if (response.success) {
          this.toastService.showSuccess('Student checked in successfully!');
          this.loadAttendance('', '', this.currentPage(), this.pageLimit()).subscribe();
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to check in student');
        return EMPTY;
      })
    );
  }

  /**
   * Check out a student.
   */
  checkOut(studentId: string, remarks = 'Checked out by admin'): Observable<ApiResponse<AttendanceRecord>> {
    this.isLoading.set(true);
    return this.http.post<ApiResponse<AttendanceRecord>>(`${this.apiUrl}/attendance/check-out/${studentId}`, { remarks }).pipe(
      tap((response) => {
        if (response.success) {
          this.toastService.showSuccess('Student checked out successfully!');
          this.loadAttendance('', '', this.currentPage(), this.pageLimit()).subscribe();
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to check out student');
        return EMPTY;
      })
    );
  }
}
