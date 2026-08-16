import { Sidebar } from '../../../shared/components/sidebar/sidebar';
/**
 * plans-list.ts
 * Super Admin: Subscription Plans Management.
 * Lists global SaaS plans, creates new plans, edits existing ones and
 * activates / deactivates them (soft toggle).
 */
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SubscriptionsService, SubscriptionPlan } from '../../../core/services/subscriptions.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-plans-list',
  standalone: true,
  imports: [Sidebar, CommonModule, FormsModule, ReactiveFormsModule, CurrencyPipe],
  templateUrl: './plans-list.html',
  styleUrl: './plans-list.css'
})
export class PlansList implements OnInit {
  public subscriptionsService = inject(SubscriptionsService);
  public themeService = inject(ThemeService);
  private fb = inject(FormBuilder);

  public plans = this.subscriptionsService.plans;
  public isLoading = this.subscriptionsService.isLoading;

  /** Modal visibility */
  public showModal = signal<boolean>(false);
  /** Plan currently being edited (null => create mode) */
  public editingPlan = signal<SubscriptionPlan | null>(null);

  public planForm!: FormGroup;

  constructor() {
    this.initForm();
  }

  ngOnInit() {
    this.subscriptionsService.loadPlans().subscribe();
  }

  private initForm() {
    this.planForm = this.fb.group({
      name: ['', [Validators.required]],
      code: ['', [Validators.required]],
      description: [''],
      price: [0, [Validators.required, Validators.min(0)]],
      currency: ['INR'],
      billing_cycle: ['MONTHLY']
    });
  }

  /** Open create modal with a prefilled code */
  public openCreate() {
    this.editingPlan.set(null);
    this.planForm.reset({
      code: 'PLAN-' + Math.floor(100 + Math.random() * 900),
      price: 999,
      currency: 'INR',
      billing_cycle: 'MONTHLY'
    });
    this.showModal.set(true);
  }

  /** Open edit modal for an existing plan */
  public openEdit(plan: SubscriptionPlan) {
    this.editingPlan.set(plan);
    this.planForm.reset({
      name: plan.name,
      code: plan.code,
      description: plan.description ?? '',
      price: plan.price,
      currency: plan.currency,
      billing_cycle: plan.billing_cycle
    });
    this.showModal.set(true);
  }

  public closeModal() {
    this.showModal.set(false);
  }

  /** Create or update based on mode */
  public submit() {
    if (this.planForm.invalid) {
      this.planForm.markAllAsTouched();
      return;
    }

    const value = this.planForm.value;
    const editing = this.editingPlan();

    if (editing) {
      this.subscriptionsService.updatePlan(editing.id, value).subscribe({
        next: () => this.closeModal()
      });
    } else {
      this.subscriptionsService.createPlan(value).subscribe({
        next: () => this.closeModal()
      });
    }
  }

  /** Activate / deactivate a plan */
  public toggleStatus(plan: SubscriptionPlan) {
    const target = plan.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const action = target === 'ACTIVE' ? 'activate' : 'deactivate';
    if (!confirm(`Are you sure you want to ${action} plan "${plan.name}"?`)) {
      return;
    }
    this.subscriptionsService.updatePlan(plan.id, { status: target }).subscribe();
  }
}
