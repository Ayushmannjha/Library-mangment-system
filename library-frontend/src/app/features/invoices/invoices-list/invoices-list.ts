import { Sidebar } from '../../../shared/components/sidebar/sidebar';
/**
 * invoices-list.ts
 * Invoice Management Component.
 * Displays financial summary statistics, invoices data table with status badges (PENDING, PAID, CANCELLED),
 * invoice creation modal, and printable invoice summary preview modal.
 */
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InvoicesService, Invoice } from '../../../core/services/invoices.service';
import { StudentsService } from '../../../core/services/students.service';
import { FeePlansService } from '../../../core/services/fee-plans.service';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { getLocalTodayDateString, formatIndianDate } from '../../../core/utils/date-utils';

@Component({
  selector: 'app-invoices-list',
  standalone: true,
  imports: [Sidebar, CommonModule, RouterLink, FormsModule, ReactiveFormsModule, CurrencyPipe, DatePipe],
  templateUrl: './invoices-list.html',
  styleUrl: './invoices-list.css'
})
export class InvoicesList implements OnInit {
  public invoicesService = inject(InvoicesService);
  public studentsService = inject(StudentsService);
  public feePlansService = inject(FeePlansService);
  public authService = inject(AuthService);
  public themeService = inject(ThemeService);
  private fb = inject(FormBuilder);

  public formatIndianDate = formatIndianDate;

  /** Signal references to service state */
  public invoices = this.invoicesService.invoices;
  public isLoading = this.invoicesService.isLoading;
  public totalInvoices = this.invoicesService.totalInvoices;
  public currentPage = this.invoicesService.currentPage;
  public pageLimit = this.invoicesService.pageLimit;

  public students = this.studentsService.students;
  public feePlans = this.feePlansService.feePlans;

  /** Filter states */
  public searchQuery = signal<string>('');
  public selectedStatus = signal<string>('');

  /** Modal Visibility States */
  public showCreateModal = signal<boolean>(false);
  public previewInvoice = signal<Invoice | null>(null);

  /** Create Invoice Form */
  public invoiceForm!: FormGroup;

  constructor() {
    this.initForm();
  }

  ngOnInit() {
    this.invoicesService.loadInvoices().subscribe();
    this.studentsService.loadStudents('', 1, 100).subscribe();
    this.feePlansService.loadFeePlans().subscribe();
  }

  /** Initialize form controls and validators */
  private initForm() {
    const defaultDueDate = getLocalTodayDateString(7);
    this.invoiceForm = this.fb.group({
      student_id: ['', [Validators.required]],
      fee_plan_id: [''],
      subtotal: [1000, [Validators.required, Validators.min(0)]],
      discount_amount: [0, [Validators.min(0)]],
      tax_amount: [0, [Validators.min(0)]],
      due_date: [defaultDueDate, [Validators.required]],
      currency: ['INR'],
      description: ['']
    });
  }

  /** Computed stat metrics */
  public totalInvoicedAmount = computed(() => this.invoices().reduce((acc, inv) => acc + inv.total_amount, 0));
  public totalPaidAmount = computed(() => this.invoices().filter(i => i.status === 'PAID').reduce((acc, inv) => acc + inv.total_amount, 0));
  public totalPendingAmount = computed(() => this.invoices().filter(i => i.status === 'PENDING').reduce((acc, inv) => acc + inv.total_amount, 0));

  /** Filtered invoice list computed from search & status signals */
  public filteredInvoices = computed(() => {
    let list = this.invoices();
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.selectedStatus();

    if (query) {
      list = list.filter(i =>
        i.invoice_number.toLowerCase().includes(query) ||
        (i.description && i.description.toLowerCase().includes(query)) ||
        (i.student_id && i.student_id.toLowerCase().includes(query))
      );
    }

    if (status) {
      list = list.filter(i => i.status === status);
    }

    return list;
  });

  /** Auto populate subtotal when fee plan is selected */
  public onFeePlanChange(event: Event) {
    const planId = (event.target as HTMLSelectElement).value;
    const selectedPlan = this.feePlans().find(p => p.id === planId);
    if (selectedPlan) {
      this.invoiceForm.patchValue({
        subtotal: selectedPlan.amount,
        currency: selectedPlan.currency
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
      this.invoicesService.loadInvoices(this.selectedStatus(), '', this.currentPage() - 1, this.pageLimit()).subscribe();
    }
  }

  public nextPage() {
    const maxPage = Math.ceil(this.totalInvoices() / this.pageLimit());
    if (this.currentPage() < maxPage) {
      this.invoicesService.loadInvoices(this.selectedStatus(), '', this.currentPage() + 1, this.pageLimit()).subscribe();
    }
  }

  /** Modal triggers */
  public openCreateModal() {
    const defaultDueDate = getLocalTodayDateString(7);
    this.invoiceForm.reset({
      subtotal: 1000,
      discount_amount: 0,
      tax_amount: 0,
      due_date: defaultDueDate,
      currency: 'INR'
    });
    this.showCreateModal.set(true);
  }

  public closeCreateModal() {
    this.showCreateModal.set(false);
  }

  public openPreviewModal(invoice: Invoice) {
    this.previewInvoice.set(invoice);
  }

  public closePreviewModal() {
    this.previewInvoice.set(null);
  }

  /** Submit handler for creating invoice */
  public submitCreate() {
    if (this.invoiceForm.invalid) {
      this.invoiceForm.markAllAsTouched();
      return;
    }

    this.invoicesService.createInvoice(this.invoiceForm.value).subscribe({
      next: () => this.closeCreateModal()
    });
  }

  /** Cancel invoice trigger */
  public cancelInvoice(invoice: Invoice) {
    if (confirm(`Are you sure you want to cancel invoice #${invoice.invoice_number}?`)) {
      this.invoicesService.cancelInvoice(invoice.id).subscribe();
    }
  }
}
