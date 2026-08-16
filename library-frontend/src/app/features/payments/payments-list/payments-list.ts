import { Sidebar } from '../../../shared/components/sidebar/sidebar';
/**
 * payments-list.ts
 * Payment Management Component.
 * Displays revenue metrics, payments transactions table with status badges (COMPLETED, REFUNDED),
 * modal form to record a payment against pending invoices, and refund trigger.
 */
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PaymentsService, Payment } from '../../../core/services/payments.service';
import { InvoicesService, Invoice } from '../../../core/services/invoices.service';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-payments-list',
  standalone: true,
  imports: [Sidebar, CommonModule, RouterLink, FormsModule, ReactiveFormsModule, CurrencyPipe, DatePipe],
  templateUrl: './payments-list.html',
  styleUrl: './payments-list.css'
})
export class PaymentsList implements OnInit {
  public paymentsService = inject(PaymentsService);
  public invoicesService = inject(InvoicesService);
  public authService = inject(AuthService);
  public themeService = inject(ThemeService);
  private fb = inject(FormBuilder);

  /** Signal references to service state */
  public payments = this.paymentsService.payments;
  public isLoading = this.paymentsService.isLoading;
  public totalPayments = this.paymentsService.totalPayments;
  public currentPage = this.paymentsService.currentPage;
  public pageLimit = this.paymentsService.pageLimit;

  public invoices = this.invoicesService.invoices;

  /** Filter states */
  public searchQuery = signal<string>('');
  public selectedMethod = signal<string>('');

  /** Modal Visibility State */
  public showRecordModal = signal<boolean>(false);

  /** Payment Form */
  public paymentForm!: FormGroup;

  constructor() {
    this.initForm();
  }

  ngOnInit() {
    this.paymentsService.loadPayments().subscribe();
    this.invoicesService.loadInvoices('PENDING').subscribe();
  }

  /** Initialize form controls and validators */
  private initForm() {
    this.paymentForm = this.fb.group({
      invoice_id: ['', [Validators.required]],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      payment_method: ['CASH', [Validators.required]],
      transaction_reference: [''],
      notes: [''],
      currency: ['INR']
    });
  }

  /** Computed metrics */
  public totalCollected = computed(() => this.payments().filter(p => p.status === 'COMPLETED').reduce((acc, p) => acc + p.amount, 0));
  public totalRefunded = computed(() => this.payments().filter(p => p.status === 'REFUNDED').reduce((acc, p) => acc + p.amount, 0));
  public pendingInvoices = computed(() => this.invoices().filter(i => i.status === 'PENDING'));

  /** Filtered payments list computed from search & method signals */
  public filteredPayments = computed(() => {
    let list = this.payments();
    const query = this.searchQuery().toLowerCase().trim();
    const method = this.selectedMethod();

    if (query) {
      list = list.filter(p =>
        p.payment_number.toLowerCase().includes(query) ||
        (p.transaction_reference && p.transaction_reference.toLowerCase().includes(query)) ||
        (p.notes && p.notes.toLowerCase().includes(query))
      );
    }

    if (method) {
      list = list.filter(p => p.payment_method === method);
    }

    return list;
  });

  /** Auto populate payment amount when invoice is selected */
  public onInvoiceChange(event: Event) {
    const invId = (event.target as HTMLSelectElement).value;
    const selectedInv = this.invoices().find(i => i.id === invId);
    if (selectedInv) {
      this.paymentForm.patchValue({
        amount: selectedInv.total_amount,
        currency: selectedInv.currency
      });
    }
  }

  /** Search input handler */
  public onSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  /** Pagination handlers */
  public prevPage() {
    if (this.currentPage() > 1) {
      this.paymentsService.loadPayments('', '', '', this.currentPage() - 1, this.pageLimit()).subscribe();
    }
  }

  public nextPage() {
    const maxPage = Math.ceil(this.totalPayments() / this.pageLimit());
    if (this.currentPage() < maxPage) {
      this.paymentsService.loadPayments('', '', '', this.currentPage() + 1, this.pageLimit()).subscribe();
    }
  }

  /** Modal triggers */
  public openRecordModal() {
    this.invoicesService.loadInvoices('PENDING').subscribe();
    this.paymentForm.reset({
      payment_method: 'CASH',
      amount: 0,
      currency: 'INR'
    });
    this.showRecordModal.set(true);
  }

  public closeRecordModal() {
    this.showRecordModal.set(false);
  }

  /** Submit handler for recording payment */
  public submitPayment() {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    this.paymentsService.createPayment(this.paymentForm.value).subscribe({
      next: () => this.closeRecordModal()
    });
  }

  /** Refund payment handler */
  public refundPayment(payment: Payment) {
    if (confirm(`Are you sure you want to refund payment #${payment.payment_number}?`)) {
      this.paymentsService.refundPayment(payment.id).subscribe();
    }
  }
}
