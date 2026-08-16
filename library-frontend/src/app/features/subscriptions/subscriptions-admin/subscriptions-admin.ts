import { Sidebar } from '../../../shared/components/sidebar/sidebar';
/**
 * subscriptions-admin.ts
 * Super Admin: Library Subscriptions (expiry) overview.
 * Lists every library's subscription with plan, status, end date and days
 * remaining, highlights plans expiring within 7 days, and lets the admin
 * switch a library's plan directly from the list.
 */
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SubscriptionsService, SubscriptionPlan, LibrarySubscriptionAdminRow } from '../../../core/services/subscriptions.service';
import { ThemeService } from '../../../core/services/theme.service';

type FilterKey = 'ALL' | 'PENDING' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'TRIALING' | 'CANCELLED';

interface FilterChip {
  key: FilterKey;
  label: string;
  count: number;
  warn?: boolean;
  accent?: boolean;
}

@Component({
  selector: 'app-subscriptions-admin',
  standalone: true,
  imports: [Sidebar, CommonModule, RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './subscriptions-admin.html',
  styleUrl: './subscriptions-admin.css'
})
export class SubscriptionsAdmin implements OnInit {
  public subscriptionsService = inject(SubscriptionsService);
  public themeService = inject(ThemeService);

  public allSubscriptions = this.subscriptionsService.allSubscriptions;
  public total = this.subscriptionsService.allSubscriptionsTotal;
  public plans = this.subscriptionsService.plans;
  public isLoading = this.subscriptionsService.isLoading;

  /** Active filter chip */
  public activeFilter = signal<FilterKey>('ALL');

  /** Per-row plan selection (row.id -> selected plan id) */
  public selectedPlanId = signal<Record<string, string>>({});

  public filteredSubscriptions = computed(() => {
    const filter = this.activeFilter();
    if (filter === 'ALL') return this.allSubscriptions();
    if (filter === 'EXPIRING') return this.allSubscriptions().filter(s => s.expiring_soon || s.status === 'EXPIRED');
    return this.allSubscriptions().filter(s => s.status === filter);
  });

  /** Count badges for the filter chips */
  public pendingCount = computed(() => this.allSubscriptions().filter(s => s.status === 'PENDING').length);
  public expiringCount = computed(() => this.allSubscriptions().filter(s => s.expiring_soon || s.status === 'EXPIRED').length);
  public activeCount = computed(() => this.allSubscriptions().filter(s => s.status === 'ACTIVE').length);
  public expiredCount = computed(() => this.allSubscriptions().filter(s => s.status === 'EXPIRED').length);

  /** Filter chip definitions for the template */
  public chips: FilterChip[] = [
    { key: 'ALL', label: 'All', count: 0 },
    { key: 'PENDING', label: 'Awaiting Payment', count: 0, accent: true },
    { key: 'ACTIVE', label: 'Active', count: 0 },
    { key: 'EXPIRING', label: 'Expiring Soon', count: 0, warn: true },
    { key: 'EXPIRED', label: 'Expired', count: 0, warn: true },
    { key: 'TRIALING', label: 'Trial', count: 0 },
    { key: 'CANCELLED', label: 'Cancelled', count: 0 }
  ];

  public chipCount(chip: FilterChip): number {
    switch (chip.key) {
      case 'ALL':
        return this.total();
      case 'PENDING':
        return this.pendingCount();
      case 'ACTIVE':
        return this.activeCount();
      case 'EXPIRING':
        return this.expiringCount();
      case 'EXPIRED':
        return this.expiredCount();
      default:
        return 0;
    }
  }

  ngOnInit() {
    this.subscriptionsService.loadAllLibrarySubscriptions({ includeInactive: true }).subscribe();
    this.subscriptionsService.loadPlans().subscribe();
  }

  public setFilter(key: FilterKey) {
    this.activeFilter.set(key);
  }

  public trackPlan(row: LibrarySubscriptionAdminRow, planId: string) {
    const map = { ...this.selectedPlanId(), [row.id]: planId };
    this.selectedPlanId.set(map);
  }

  public selectedPlan(row: LibrarySubscriptionAdminRow): string {
    return this.selectedPlanId()[row.id] ?? '';
  }

  /** Change the plan of a subscription row */
  public changePlan(row: LibrarySubscriptionAdminRow) {
    const planId = this.selectedPlan(row);
    if (!planId) {
      return;
    }
    if (!confirm(`Change plan for "${row.library.name}" from ${row.plan.name}?`)) {
      return;
    }
    this.subscriptionsService.changeLibraryPlan(row.id, planId).subscribe({
      next: () => {
        this.selectedPlanId.set({ ...this.selectedPlanId(), [row.id]: '' });
        this.subscriptionsService.loadAllLibrarySubscriptions({ includeInactive: true }).subscribe();
      }
    });
  }

  /** Confirm payment and activate a PENDING subscription */
  public confirmSubscription(row: LibrarySubscriptionAdminRow) {
    if (!confirm(`Confirm payment and activate "${row.library.name}" (${row.plan.name} — ₹${row.price})?`)) {
      return;
    }
    this.subscriptionsService.confirmSubscription(row.id).subscribe({
      next: () => {
        this.subscriptionsService.loadAllLibrarySubscriptions({ includeInactive: true }).subscribe();
      }
    });
  }

  /** Whether a subscription is currently expiring soon or already expired */
  public isAttention(row: LibrarySubscriptionAdminRow): boolean {
    return row.expiring_soon || row.status === 'EXPIRED';
  }
}
