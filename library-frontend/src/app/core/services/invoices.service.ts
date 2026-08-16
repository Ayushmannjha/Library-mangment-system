/**
 * invoices.service.ts
 * Core service for Invoice & Billing Management in Library Admin / Staff context.
 * Handles listing invoices, generating student bills, updating pending invoices, and cancelling invoices using Angular Signals.
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { tap, catchError, EMPTY, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';
import { ToastService } from './toast.service';

/** Invoice entity structure returned from backend `GET /api/v1/invoices` */
export interface Invoice {
  id: string;
  student_id: string;
  fee_plan_id?: string | null;
  invoice_number: string;
  due_date?: string | null;
  description?: string | null;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  created_at?: string;
}

/** DTO payload required to create a new invoice */
export interface CreateInvoicePayload {
  student_id: string;
  fee_plan_id?: string;
  subtotal?: number;
  discount_amount?: number;
  tax_amount?: number;
  due_date?: string;
  currency?: string;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InvoicesService {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private apiUrl = environment.apiUrl;

  /** Signal holding current list of invoices */
  public invoices = signal<Invoice[]>([]);

  /** Signal tracking total count of invoices */
  public totalInvoices = signal<number>(0);

  /** Signal tracking current page index */
  public currentPage = signal<number>(1);

  /** Signal tracking page limit */
  public pageLimit = signal<number>(10);

  /** Signal tracking loading state */
  public isLoading = signal<boolean>(false);

  /**
   * Load invoices with optional status, student filtering, and pagination.
   */
  loadInvoices(status = '', studentId = '', page = 1, limit = 10): Observable<ApiResponse<Invoice[]>> {
    this.isLoading.set(true);
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (status.trim()) params = params.set('status', status.trim());
    if (studentId.trim()) params = params.set('student_id', studentId.trim());

    return this.http.get<ApiResponse<Invoice[]>>(`${this.apiUrl}/invoices`, { params }).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.invoices.set(response.data);
          this.totalInvoices.set(response.meta?.['total'] as number ?? response.data.length);
          this.currentPage.set(page);
          this.pageLimit.set(limit);
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to load invoices');
        return EMPTY;
      })
    );
  }

  /**
   * Create a new invoice.
   */
  createInvoice(payload: CreateInvoicePayload): Observable<ApiResponse<Invoice>> {
    this.isLoading.set(true);
    return this.http.post<ApiResponse<Invoice>>(`${this.apiUrl}/invoices`, payload).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.toastService.showSuccess(`Invoice #${response.data.invoice_number} generated!`);
          this.loadInvoices('', '', this.currentPage(), this.pageLimit()).subscribe();
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to generate invoice');
        return EMPTY;
      })
    );
  }

  /**
   * Cancel an invoice (soft delete).
   */
  cancelInvoice(id: string): Observable<ApiResponse<Invoice>> {
    this.isLoading.set(true);
    return this.http.delete<ApiResponse<Invoice>>(`${this.apiUrl}/invoices/${id}`).pipe(
      tap((response) => {
        if (response.success) {
          this.toastService.showSuccess('Invoice cancelled successfully');
          this.loadInvoices('', '', this.currentPage(), this.pageLimit()).subscribe();
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to cancel invoice');
        return EMPTY;
      })
    );
  }
}
