import { Sidebar } from '../../../shared/components/sidebar/sidebar';
/**
 * roles-form.ts
 * Role create / edit form component.
 * /roles/create aur /roles/:id/edit dono routes is component ko use karte hain.
 */

import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RolesService } from '../roles.service';
import { ToastService } from '../../../core/services/toast.service';


@Component({
  selector: 'app-roles-form',
  standalone: true,
  imports: [Sidebar, ReactiveFormsModule, RouterLink, Sidebar],
  templateUrl: './roles-form.html',
  styleUrl: './roles-form.css'
})
export class RolesForm implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private rolesService = inject(RolesService);
  private toastService = inject(ToastService);

  /** Edit mode ya create mode — URL mein :id hone par edit mode */
  isEditMode = signal(false);
  roleId = signal<number | null>(null);
  isLoading = signal(false);

  roleForm: FormGroup;

  constructor() {
    this.roleForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: ['']
    });
  }

  ngOnInit() {
    // Route se :id param lo — agar hai toh edit mode
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.roleId.set(+id);
      this.loadRole(+id);
    }
  }

  /** Existing role ka data form mein load karta hai */
  private loadRole(id: number) {
    this.isLoading.set(true);
    this.rolesService.getRoleById(id).subscribe({
      next: (response) => {
        if (response.success) {
          this.roleForm.patchValue({
            name: response.data.name,
            description: response.data.description || ''
          });
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.toastService.showError('Failed to load role.');
        this.isLoading.set(false);
      }
    });
  }

  /** Form submit — create ya update API call karta hai */
  onSubmit() {
    if (this.roleForm.invalid) {
      this.roleForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    const data = this.roleForm.value;

    const request$ = this.isEditMode()
      ? this.rolesService.updateRole(this.roleId()!, data)
      : this.rolesService.createRole(data);

    request$.subscribe({
      next: () => {
        this.toastService.showSuccess(
          this.isEditMode() ? 'Role updated successfully!' : 'Role created successfully!'
        );
        this.router.navigate(['/roles']);
      },
      error: () => {
        this.toastService.showError('Operation failed. Please try again.');
        this.isLoading.set(false);
      }
    });
  }
}
