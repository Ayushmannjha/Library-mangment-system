/**
 * payments.service.ts
 * Core service for Payment Management in Library Admin / Staff context.
 * Handles recording invoice payments (CASH, UPI, CARD, NET_BANKING), tracking transaction histories,
 * and refunding payments using Angular Signals.
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { tap, catchError, EMPTY, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';
import { ToastService } from './toast.service';

/** Payment transaction entity structure returned from backend `GET /api/v1/payments` */
export interface Payment {
  id: string;
  invoice_id: string;
  student_id: string;
  payment_number: string;
  amount: number;
  payment_method: 'CASH' | 'UPI' | 'CARD' | 'NET_BANKING';
  transaction_reference?: string | null;
  notes?: string | null;
  currency: string;
  status: 'COMPLETED' | 'REFUNDED';
  payment_date: string;
}

/** DTO payload required to record a new payment */
export interface CreatePaymentPayload {
  invoice_id: string;
  amount: number;
  payment_method: 'CASH' | 'UPI' | 'CARD' | 'NET_BANKING';
  transaction_reference?: string;
  notes?: string;
  currency?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentsService {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private apiUrl = environment.apiUrl;

  /** Signal holding current list of payments */
  public payments = signal<Payment[]>([]);

  /** Signal tracking total count of payments */
  public totalPayments = signal<number>(0);

  /** Signal tracking current page index */
  public currentPage = signal<number>(1);

  /** Signal tracking page limit */
  public pageLimit = signal<number>(10);

  /** Signal tracking loading state */
  public isLoading = signal<boolean>(false);

  /**
   * Load payments with optional filters for invoice, student, status, and pagination.
   */
  loadPayments(status = '', studentId = '', invoiceId = '', page = 1, limit = 10): Observable<ApiResponse<Payment[]>> {
    this.isLoading.set(true);
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (status.trim()) params = params.set('status', status.trim());
    if (studentId.trim()) params = params.set('student_id', studentId.trim());
    if (invoiceId.trim()) params = params.set('invoice_id', invoiceId.trim());

    return this.http.get<ApiResponse<Payment[]>>(`${this.apiUrl}/payments`, { params }).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.payments.set(response.data);
          this.totalPayments.set(response.meta?.['total'] as number ?? response.data.length);
          this.currentPage.set(page);
          this.pageLimit.set(limit);
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to load payments');
        return EMPTY;
      })
    );
  }

  /**
   * Record a payment against an invoice.
   */
  createPayment(payload: CreatePaymentPayload): Observable<ApiResponse<Payment>> {
    this.isLoading.set(true);
    return this.http.post<ApiResponse<Payment>>(`${this.apiUrl}/payments`, payload).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.toastService.showSuccess(`Payment #${response.data.payment_number} recorded successfully!`);
          this.loadPayments('', '', '', this.currentPage(), this.pageLimit()).subscribe();
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to record payment');
        return EMPTY;
      })
    );
  }

  /**
   * Refund a payment.
   */
  refundPayment(id: string): Observable<ApiResponse<Payment>> {
    this.isLoading.set(true);
    return this.http.patch<ApiResponse<Payment>>(`${this.apiUrl}/payments/${id}/refund`, {}).pipe(
      tap((response) => {
        if (response.success) {
          this.toastService.showSuccess('Payment refunded successfully!');
          this.loadPayments('', '', '', this.currentPage(), this.pageLimit()).subscribe();
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.toastService.showError(err.error?.message || 'Failed to refund payment');
        return EMPTY;
      })
    );
  }
}
