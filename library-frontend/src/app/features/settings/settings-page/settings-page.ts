import { Sidebar } from '../../../shared/components/sidebar/sidebar';
/**
 * settings-page.ts
 * System & Library Settings Component.
 * Allows library admins to configure General Library Profile (Name, Phone, Address), Security Settings,
 * and Notification preferences using Angular Reactive Forms & Signals.
 */
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [Sidebar, CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.css'
})
export class SettingsPage implements OnInit {
  public authService = inject(AuthService);
  public themeService = inject(ThemeService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);

  /** Active Tab State */
  public activeTab = signal<'GENERAL' | 'SECURITY' | 'NOTIFICATIONS'>('GENERAL');

  /** Forms */
  public generalForm!: FormGroup;
  public securityForm!: FormGroup;

  constructor() {
    this.initForms();
  }

  ngOnInit() {
    const user = this.authService.currentUser();
    if (user) {
      this.generalForm.patchValue({
        library_name: 'Lexicon LMS Library',
        contact_phone: '+91 9876543210',
        contact_email: user.email,
        address: '123 Enterprise Academic Way, Tech Park'
      });
    }
  }

  private initForms() {
    this.generalForm = this.fb.group({
      library_name: ['', [Validators.required]],
      contact_phone: [''],
      contact_email: ['', [Validators.required, Validators.email]],
      address: ['']
    });

    this.securityForm = this.fb.group({
      current_password: ['', [Validators.required]],
      new_password: ['', [Validators.required, Validators.minLength(8)]],
      confirm_password: ['', [Validators.required]]
    });
  }

  public saveGeneral() {
    if (this.generalForm.invalid) {
      this.generalForm.markAllAsTouched();
      return;
    }
    this.toastService.showSuccess('Library general settings updated successfully!');
  }

  public saveSecurity() {
    if (this.securityForm.invalid) {
      this.securityForm.markAllAsTouched();
      return;
    }
    const { new_password, confirm_password } = this.securityForm.value;
    if (new_password !== confirm_password) {
      this.toastService.showError('New passwords do not match');
      return;
    }
    this.toastService.showSuccess('Password updated successfully!');
    this.securityForm.reset();
  }
}
