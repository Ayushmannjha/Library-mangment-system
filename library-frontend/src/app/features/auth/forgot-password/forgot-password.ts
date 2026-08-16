/**
 * forgot-password.ts
 * Step 1: User enters their email to receive a 6-digit OTP.
 * On success, navigates to reset-password page with email as query param.
 */

import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css'
})
export class ForgotPassword {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  public authService = inject(AuthService);

  forgotForm: FormGroup;
  submitted = false;

  constructor() {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit() {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    const { email } = this.forgotForm.value;
    this.authService.forgotPassword(email).subscribe({
      next: () => {
        this.submitted = true;
        // Navigate to reset-password with email in query params
        setTimeout(() => {
          this.router.navigate(['/reset-password'], { queryParams: { email } });
        }, 1500);
      }
    });
  }
}
