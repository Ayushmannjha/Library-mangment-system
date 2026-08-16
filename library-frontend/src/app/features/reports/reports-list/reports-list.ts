import { Sidebar } from '../../../shared/components/sidebar/sidebar';
/**
 * reports-list.ts
 * Reports & Analytics Dashboard Component.
 * Displays financial revenue charts, occupancy analytics, attendance trends, and export options.
 */
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ReportsService } from '../../../core/services/reports.service';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-reports-list',
  standalone: true,
  imports: [Sidebar, CommonModule, RouterLink, FormsModule, CurrencyPipe],
  templateUrl: './reports-list.html',
  styleUrl: './reports-list.css'
})
export class ReportsList implements OnInit {
  public reportsService = inject(ReportsService);
  public authService = inject(AuthService);
  public themeService = inject(ThemeService);

  /** Signal references */
  public metrics = this.reportsService.metrics;
  public revenueData = this.reportsService.revenueData;
  public attendanceData = this.reportsService.attendanceData;
  public isLoading = this.reportsService.isLoading;

  /** Date filters */
  public startDate = signal<string>('');
  public endDate = signal<string>('');

  ngOnInit() {
    this.reportsService.loadDashboardMetrics().subscribe();
    this.reportsService.loadRevenueReport().subscribe();
    this.reportsService.loadAttendanceReport().subscribe();
  }

  /** Computed occupancy rate percentage */
  public occupancyRate = computed(() => {
    const m = this.metrics();
    if (!m || !m.total_seats) return 0;
    return Math.round((m.occupied_seats / m.total_seats) * 100);
  });

  /** Apply date range filters */
  public applyFilter() {
    this.reportsService.loadRevenueReport(this.startDate(), this.endDate()).subscribe();
    this.reportsService.loadAttendanceReport(this.startDate(), this.endDate()).subscribe();
  }
}
