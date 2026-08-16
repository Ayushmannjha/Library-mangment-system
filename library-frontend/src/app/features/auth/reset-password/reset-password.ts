/**
 * reset-password.ts
 * Step 2: User enters OTP (received via email) + new password.
 * Email is read from the query params (set by forgot-password redirect).
 * On success, navigates back to /login.
 */

import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css'
})
export class ResetPassword implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public authService = inject(AuthService);

  resetForm: FormGroup;
  showPassword = false;
  email = '';

  constructor() {
    this.resetForm = this.fb.group({
      otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      new_password: ['', [Validators.required, Validators.minLength(8)]],
      confirm_password: ['', [Validators.required]]
    });
  }

  ngOnInit() {
    this.email = this.route.snapshot.queryParamMap.get('email') || '';
    if (!this.email) {
      // No email in query — redirect back to forgot-password
      this.router.navigate(['/forgot-password']);
    }
  }

  /** Password visibility toggle */
  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    const { new_password, confirm_password } = this.resetForm.value;
    if (new_password !== confirm_password) {
      this.resetForm.get('confirm_password')?.setErrors({ mismatch: true });
      return;
    }

    const { otp } = this.resetForm.value;
    this.authService.resetPassword(this.email, otp, new_password).subscribe({
      next: () => this.router.navigate(['/login'])
    });
  }
}
