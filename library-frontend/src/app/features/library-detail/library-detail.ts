import { Sidebar } from '../../shared/components/sidebar/sidebar';
/**
 * library-detail.ts
 * Super Admin: Library Detail.
 * Shows a library's information, its owner user and current subscription,
 * with activate / deactivate controls and a plan-change dropdown.
 */
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LibrariesService, LibraryDetail as LibraryDetailModel } from '../../core/services/libraries.service';
import { SubscriptionsService } from '../../core/services/subscriptions.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-library-detail',
  standalone: true,
  imports: [Sidebar, CommonModule, RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './library-detail.html',
  styleUrl: './library-detail.css'
})
export class LibraryDetail implements OnInit {
  public librariesService = inject(LibrariesService);
  public subscriptionsService = inject(SubscriptionsService);
  public themeService = inject(ThemeService);
  private route = inject(ActivatedRoute);

  public detail = this.librariesService.libraryDetail;
  public plans = this.subscriptionsService.plans;
  public isLoading = this.librariesService.isLoading;

  /** Selected plan for the change-plan control */
  public selectedPlanId = signal<string>('');

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.librariesService.loadLibraryDetail(id).subscribe();
      this.subscriptionsService.loadPlans().subscribe();
    }
  }

  public toggleStatus(detail: LibraryDetailModel) {
    const isActive = detail.library.status === 'ACTIVE';
    const target = isActive ? 'INACTIVE' : 'ACTIVE';
    const action = isActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} "${detail.library.name}"?`)) {
      return;
    }
    this.librariesService.updateLibraryStatus(detail.library.id, target).subscribe({
      next: () => {
        const id = detail.library.id;
        this.librariesService.loadLibraryDetail(id).subscribe();
      }
    });
  }

  /** Apply the selected plan to the current subscription */
  public changePlan() {
    const detail = this.detail();
    const planId = this.selectedPlanId();
    if (!detail?.subscription || !planId || planId === detail.subscription.plan_id) {
      return;
    }
    if (!confirm(`Change subscription plan for "${detail.library.name}" to the selected plan?`)) {
      return;
    }
    const libraryId = detail.library.id;
    const subscriptionId = detail.subscription.id;
    this.subscriptionsService.changeLibraryPlan(subscriptionId, planId).subscribe({
      next: () => {
        this.selectedPlanId.set('');
        this.librariesService.loadLibraryDetail(libraryId).subscribe();
      }
    });
  }
}
