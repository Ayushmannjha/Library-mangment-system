import { Sidebar } from '../../shared/components/sidebar/sidebar';
/**
 * super-admin-dashboard.ts
 * Super Admin SaaS Platform Overview Dashboard Component.
 * Dynamic metrics, status breakdown, and recent registered libraries fetch karta hai.
 */
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SaasService } from '../../core/services/saas.service';
import { ThemeService } from '../../core/services/theme.service';


@Component({
  selector: 'app-super-admin-dashboard',
  standalone: true,
  imports: [Sidebar, CommonModule, RouterLink, CurrencyPipe, DatePipe, Sidebar],
  templateUrl: './super-admin-dashboard.html',
  styleUrl: './super-admin-dashboard.css'
})
export class SuperAdminDashboard implements OnInit {
  private saasService = inject(SaasService);
  public themeService = inject(ThemeService);
  
  /** Signal for SaaS metrics (Total/Active/Paid Libraries, Revenue, Recent Libraries) */
  public metrics = this.saasService.metrics;

  /** Signal for loading state */
  public isLoading = this.saasService.isLoading;

  ngOnInit() {
    this.saasService.loadDashboardMetrics().subscribe();
  }
}