import { Sidebar } from '../../shared/components/sidebar/sidebar';
/**
 * dashboard.ts
 * Authenticated Library Admin / Staff Dashboard Component.
 * Displays tenant-isolated operational KPIs (Students, Seats, Occupancy, Attendance, Revenue, Dues).
 */
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [Sidebar, CommonModule, RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  public authService = inject(AuthService);
  public dashboardService = inject(DashboardService);
  public themeService = inject(ThemeService);

  /** Signal references to dashboard state */
  public metrics = this.dashboardService.metrics;
  public isLoading = this.dashboardService.isLoading;
  public currentUser = this.authService.currentUser;

  /** Today's date string for header */
  public currentDate = new Date();

  ngOnInit() {
    this.dashboardService.loadDashboardMetrics().subscribe();
  }

  /** Logout action handler */
  public logout() {
    this.authService.logout();
  }
}