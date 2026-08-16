import { Sidebar } from '../../../shared/components/sidebar/sidebar';
/**
 * fees-list.ts
 * Fees & Dues — student's invoices and payments (GET /student/fees).
 */
import { Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { StudentService } from '../../../core/services/student.service';
import { ThemeService } from '../../../core/services/theme.service';
import { StudentInvoice } from '../../../core/models/student.models';

@Component({
  selector: 'app-fees-list',
  standalone: true,
  imports: [Sidebar, CommonModule, DatePipe, CurrencyPipe],
  templateUrl: './fees-list.html',
  styleUrl: './fees-list.css'
})
export class FeesList implements OnInit {
  public studentService = inject(StudentService);
  public themeService = inject(ThemeService);

  public invoices = this.studentService.invoices;
  public isLoading = this.studentService.isLoading;

  /** Total billed amount across all invoices */
  public totalBilled = computed(() =>
    this.invoices().reduce((sum, i) => sum + Number(i.total_amount), 0)
  );

  /** Total paid amount */
  public totalPaid = computed(() =>
    this.invoices()
      .filter(i => i.status === 'PAID')
      .reduce((sum, i) => sum + Number(i.total_amount), 0)
  );

  /** Total outstanding (unpaid) amount */
  public totalDue = computed(() =>
    this.invoices()
      .filter(i => i.status !== 'PAID')
      .reduce((sum, i) => sum + Number(i.total_amount), 0)
  );

  /** Currency used across invoices (default INR) */
  public currency = computed(() => this.invoices()[0]?.currency ?? 'INR');

  public hasInvoices = computed(() => this.invoices().length > 0);

  ngOnInit() {
    this.studentService.loadFees().subscribe();
  }

  /** Status badge classes */
  public statusClass(status: string): string {
    const s = status?.toUpperCase() ?? '';
    if (s === 'PAID') return 'app-badge-active';
    if (s === 'PENDING' || s === 'DUE') return 'app-badge-maintenance';
    if (s === 'OVERDUE' || s === 'CANCELLED') return 'app-badge-inactive';
    return 'app-badge-occupied';
  }

  /** Payments total for a single invoice */
  public invoicePaid(inv: StudentInvoice): number {
    return (inv.payments ?? [])
      .filter(p => p.status === 'SUCCESS')
      .reduce((sum, p) => sum + Number(p.amount), 0);
  }

  /** Remaining balance for a single invoice */
  public invoiceDue(inv: StudentInvoice): number {
    const total = Number(inv.total_amount);
    const paid = this.invoicePaid(inv);
    return Math.max(total - paid, 0);
  }
}
