/**
 * login.ts
 * Student Portal Login page component.
 * AuthService ke zariye real backend se JWT token leta hai.
 * Form validation + show/hide password toggle bhi handle karta hai.
 */

import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  public authService = inject(AuthService); // Public taaki template mein use ho sake

  /** Login form definition with validators */
  loginForm: FormGroup;

  /** Password field show/hide state */
  showPassword = false;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  /** Password visibility toggle */
  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  /**
   * Form submit handler.
   * Valid form hone par AuthService.login() call karta hai.
   * AuthService khud hi redirect handle karta hai role ke hisab se.
   */
  onSubmit() {
    if (this.loginForm.invalid) {
      // Saare fields touched mark karo taaki validation errors dikhen
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.loginForm.value;

    // AuthService ke login Observable ko subscribe karo
    this.authService.login({ email, password }).subscribe();
  }
}
