/**
 * register.ts
 * Register (Branding) page — public self-service signup.
 * Library owner apni library + admin account ek saath register karta hai.
 * Success par login page par redirect hota hai.
 */

import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  public authService = inject(AuthService);

  /** Registration form definition with validators */
  registerForm: FormGroup;

  /** Password field show/hide state */
  showPassword = false;

  constructor() {
    this.registerForm = this.fb.group({
      library_name: ['', [Validators.required, Validators.maxLength(150)]],
      library_city: ['', [Validators.maxLength(100)]],
      library_phone: ['', [Validators.maxLength(20)]],
      first_name: ['', [Validators.required, Validators.maxLength(100)]],
      last_name: ['', [Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  /** Password visibility toggle */
  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  /**
   * Form submit handler.
   * Valid form hone par AuthService.registerLibrary() call karta hai.
   * Success par /login par redirect, error par toast already dikhaya jata hai.
   */
  onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const payload = this.registerForm.value;
    this.authService.registerLibrary(payload).subscribe({
      next: () => this.router.navigate(['/login'])
    });
  }
}
