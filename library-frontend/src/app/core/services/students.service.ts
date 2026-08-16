/**
 * students.service.ts
 * Core service for Student Management in Library Admin / Staff context.
 * Handles paginated listing, student creation, updates, and status toggling using Angular Signals.
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { tap, catchError, EMPTY, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';
import { ToastService } from './toast.service';

/** Student entity structure returned from backend `GET /api/v1/students` */
export interface Student {
  id: string;
  admission_number: string;
  first_name: string;
  last_name?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  email?: string | null;
  phone?: string | null;
  alternate_phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  notes?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
}

/** DTO payload required to create a new student */
export interface CreateStudentPayload {
  admission_number: string;
  first_name: string;
  last_name?: string;
  gender?: string;
  date_of_birth?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class StudentsService {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private apiUrl = environment.apiUrl;

  /** Signal holding current list of students */
  public students = signal<Student[]>([]);

  /** Signal tracking total count of students */
  public totalStudents = signal<number>(0);

  /** Signal tracking current page index */
  public currentPage = signal<number>(1);

  /** Signal tracking page limit */
  public pageLimit = signal<number>(10);

  /** Signal tracking loading state */
  public isLoading = signal<boolean>(false);

  /**
   * Load students list with optional search query and pagination.
   */
  loadStudents(search = '', page = 1, limit = 10): Observable<ApiResponse<Student[]>> {
    this.isLoading.set(true);
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (search.trim()) {
      params = params.set('search', search.trim());
    }

    return this.http.get<ApiResponse<Student[]>>(`${this.apiUrl}/students`, { params }).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.students.set(response.data);
          this.totalStudents.set(response.meta?.['total'] as number ?? response.data.length);
          this.currentPage.set(page);
          this.pageLimit.set(limit);
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to load students list');
        return EMPTY;
      })
    );
  }

  /**
   * Create a new student profile in the library.
   */
  createStudent(payload: CreateStudentPayload): Observable<ApiResponse<Student>> {
    this.isLoading.set(true);
    return this.http.post<ApiResponse<Student>>(`${this.apiUrl}/students`, payload).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.toastService.showSuccess(`Student "${response.data.first_name}" created successfully!`);
          this.loadStudents('', this.currentPage(), this.pageLimit()).subscribe();
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to create student');
        return EMPTY;
      })
    );
  }

  /**
   * Update student status (`ACTIVE` or `INACTIVE`).
   */
  updateStudentStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): Observable<ApiResponse<Student>> {
    this.isLoading.set(true);
    return this.http.patch<ApiResponse<Student>>(`${this.apiUrl}/students/${id}/status`, { status }).pipe(
      tap((response) => {
        if (response.success) {
          this.toastService.showSuccess(`Student status changed to ${status}`);
          this.loadStudents('', this.currentPage(), this.pageLimit()).subscribe();
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to update student status');
        return EMPTY;
      })
    );
  }
}
