import { Sidebar } from '../../../shared/components/sidebar/sidebar';
/**
 * fee-plans-list.ts
 * Fee Plan Management Component.
 * Displays pricing tiers, plan cards, create/edit modal form, and soft delete trigger.
 */
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FeePlansService, FeePlan } from '../../../core/services/fee-plans.service';
import { TimeSlotsService } from '../../../core/services/time-slots.service';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-fee-plans-list',
  standalone: true,
  imports: [Sidebar, CommonModule, RouterLink, FormsModule, ReactiveFormsModule, CurrencyPipe],
  templateUrl: './fee-plans-list.html',
  styleUrl: './fee-plans-list.css'
})
export class FeePlansList implements OnInit {
  public feePlansService = inject(FeePlansService);
  public timeSlotsService = inject(TimeSlotsService);
  public authService = inject(AuthService);
  public themeService = inject(ThemeService);
  private fb = inject(FormBuilder);

  /** Signal references to service state */
  public feePlans = this.feePlansService.feePlans;
  public isLoading = this.feePlansService.isLoading;
  public totalFeePlans = this.feePlansService.totalFeePlans;

  public slots = this.timeSlotsService.slots;

  /** Filter state */
  public searchQuery = signal<string>('');
  public selectedCycle = signal<string>('');

  /** Create/Edit Modal Visibility State */
  public showModal = signal<boolean>(false);
  public editingPlan = signal<FeePlan | null>(null);

  /** Plan Form */
  public planForm!: FormGroup;

  constructor() {
    this.initForm();
  }

  ngOnInit() {
    this.feePlansService.loadFeePlans().subscribe();
    this.timeSlotsService.loadSlots().subscribe();
  }

  /** Initialize form controls and validators */
  private initForm() {
    this.planForm = this.fb.group({
      name: ['', [Validators.required]],
      code: ['', [Validators.required]],
      description: [''],
      amount: [1000, [Validators.required, Validators.min(0)]],
      currency: ['INR'],
      billing_cycle: ['MONTHLY'],
      duration_days: [30, [Validators.required, Validators.min(1)]],
      time_slot_id: ['']
    });
  }

  /** Filtered fee plans computed from search and cycle signals */
  public filteredPlans = computed(() => {
    let list = this.feePlans();
    const query = this.searchQuery().toLowerCase().trim();
    const cycle = this.selectedCycle();

    if (query) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.code.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query))
      );
    }

    if (cycle) {
      list = list.filter(p => p.billing_cycle === cycle);
    }

    return list;
  });

  /** Search input handler */
  public onSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  /** Open modal for creating a new fee plan */
  public openCreateModal() {
    this.editingPlan.set(null);
    const autoCode = 'PLAN-' + Math.floor(100 + Math.random() * 900);
    this.planForm.reset({
      code: autoCode,
      amount: 1000,
      currency: 'INR',
      billing_cycle: 'MONTHLY',
      duration_days: 30
    });
    this.showModal.set(true);
  }

  /** Open modal for editing an existing fee plan */
  public openEditModal(plan: FeePlan) {
    this.editingPlan.set(plan);
    this.planForm.patchValue({
      name: plan.name,
      code: plan.code,
      description: plan.description ?? '',
      amount: plan.amount,
      currency: plan.currency,
      billing_cycle: plan.billing_cycle,
      duration_days: plan.duration_days ?? 30,
      time_slot_id: plan.time_slot_id ?? ''
    });
    this.showModal.set(true);
  }

  /** Close modal */
  public closeModal() {
    this.showModal.set(false);
    this.editingPlan.set(null);
  }

  /** Submit handler for create/edit */
  public submitForm() {
    if (this.planForm.invalid) {
      this.planForm.markAllAsTouched();
      return;
    }

    const val = this.planForm.value;
    const currentPlan = this.editingPlan();

    if (currentPlan) {
      this.feePlansService.updateFeePlan(currentPlan.id, val).subscribe({
        next: () => this.closeModal()
      });
    } else {
      this.feePlansService.createFeePlan(val).subscribe({
        next: () => this.closeModal()
      });
    }
  }

  /** Soft delete / deactivate fee plan */
  public deletePlan(plan: FeePlan) {
    if (confirm(`Are you sure you want to deactivate fee plan "${plan.name}"?`)) {
      this.feePlansService.deleteFeePlan(plan.id).subscribe();
    }
  }
}
