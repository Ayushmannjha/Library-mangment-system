import { Sidebar } from '../../../shared/components/sidebar/sidebar';
/**
 * subscriptions-list.ts
 * SaaS Subscriptions Management Component.
 * Displays current library active/trialing SaaS subscription card, platform plans grid,
 * activation triggers, and Super Admin plan creator modal.
 */
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SubscriptionsService, SubscriptionPlan } from '../../../core/services/subscriptions.service';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-subscriptions-list',
  standalone: true,
  imports: [Sidebar, CommonModule, RouterLink, FormsModule, ReactiveFormsModule, CurrencyPipe, DatePipe],
  templateUrl: './subscriptions-list.html',
  styleUrl: './subscriptions-list.css'
})
export class SubscriptionsList implements OnInit {
  public subscriptionsService = inject(SubscriptionsService);
  public authService = inject(AuthService);
  public themeService = inject(ThemeService);
  private fb = inject(FormBuilder);

  /** Signal references to service state */
  public plans = this.subscriptionsService.plans;
  public mySub = this.subscriptionsService.mySubscription;
  public isLoading = this.subscriptionsService.isLoading;

  /** Create Plan Modal Visibility State */
  public showPlanModal = signal<boolean>(false);

  /** Plan Form */
  public planForm!: FormGroup;

  constructor() {
    this.initForm();
  }

  ngOnInit() {
    this.subscriptionsService.loadPlans().subscribe();
    this.subscriptionsService.loadMySubscription().subscribe();
  }

  private initForm() {
    this.planForm = this.fb.group({
      name: ['', [Validators.required]],
      code: ['', [Validators.required]],
      description: [''],
      price: [2999, [Validators.required, Validators.min(0)]],
      currency: ['INR'],
      billing_cycle: ['MONTHLY'],
      max_students: [500, [Validators.required, Validators.min(1)]],
      max_seats: [100, [Validators.required, Validators.min(1)]],
      max_users: [10, [Validators.required, Validators.min(1)]]
    });
  }

  /** Modal triggers */
  public openPlanModal() {
    const autoCode = 'SAAS-' + Math.floor(100 + Math.random() * 900);
    this.planForm.reset({
      code: autoCode,
      price: 2999,
      currency: 'INR',
      billing_cycle: 'MONTHLY',
      max_students: 500,
      max_seats: 100,
      max_users: 10
    });
    this.showPlanModal.set(true);
  }

  public closePlanModal() {
    this.showPlanModal.set(false);
  }

  /** Activate current subscription */
  public activateMySub() {
    if (confirm('Activate your current subscription plan now?')) {
      this.subscriptionsService.activateSubscription().subscribe();
    }
  }

  /** Submit handler for creating platform plan */
  public submitPlanForm() {
    if (this.planForm.invalid) {
      this.planForm.markAllAsTouched();
      return;
    }

    this.subscriptionsService.createPlan(this.planForm.value).subscribe({
      next: () => this.closePlanModal()
    });
  }
}
