/**
 * register.ts
 * Register (Branding) page — public self-service signup.
 * Library owner selects a plan + enters library + admin details.
 * Library + user are created as INACTIVE; subscription as PENDING.
 * A super-admin must confirm payment before the owner can log in.
 */

import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { PublicPlan } from '../../../core/models/auth.models';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  public authService = inject(AuthService);

  registerForm: FormGroup;
  showPassword = false;
  plans: PublicPlan[] = [];
  selectedPlanId: number | null = null;
  registrationSuccess = signal(false);

  constructor() {
    this.registerForm = this.fb.group({
      library_name: ['', [Validators.required, Validators.maxLength(150)]],
      library_city: ['', [Validators.maxLength(100)]],
      library_phone: ['', [Validators.maxLength(20)]],
      first_name: ['', [Validators.required, Validators.maxLength(100)]],
      last_name: ['', [Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      plan_id: [null, [Validators.required]]
    });
  }

  ngOnInit() {
    this.authService.getPublicPlans().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.plans = res.data;
        }
      }
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  selectPlan(planId: number) {
    this.selectedPlanId = planId;
    this.registerForm.patchValue({ plan_id: planId });
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const payload = this.registerForm.value;
    this.authService.registerLibrary(payload).subscribe({
      next: () => this.registrationSuccess.set(true)
    });
  }
}
