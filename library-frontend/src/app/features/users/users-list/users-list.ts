import { Sidebar } from '../../../shared/components/sidebar/sidebar';
/**
 * users-list.ts
 * Staff & User Management Page Component.
 * Allows filtering, listing, creating staff users, and toggling user status.
 */
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UsersService, AppUser } from '../../../core/services/users.service';
import { RolesService } from '../../roles/roles.service';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [Sidebar, CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  templateUrl: './users-list.html',
  styleUrl: './users-list.css'
})
export class UsersList implements OnInit {
  public usersService = inject(UsersService);
  public rolesService = inject(RolesService);
  public authService = inject(AuthService);
  public themeService = inject(ThemeService);
  private fb = inject(FormBuilder);

  /** Signal references to service state */
  public users = this.usersService.users;
  public isLoading = this.usersService.isLoading;
  public totalUsers = this.usersService.totalUsers;
  public availableRoles = this.rolesService.roles;

  /** Filter states */
  public searchQuery = signal<string>('');
  public selectedRole = signal<string>('');
  public selectedStatus = signal<string>('');

  /** Create User Modal Visibility State */
  public showCreateModal = signal<boolean>(false);

  /** Create User Form */
  public createForm!: FormGroup;

  constructor() {
    this.initForm();
  }

  ngOnInit() {
    this.usersService.loadUsers().subscribe();
    this.rolesService.loadRoles().subscribe();
  }

  /** Initialize form controls and validators for creating a user */
  private initForm() {
    this.createForm = this.fb.group({
      first_name: ['', [Validators.required]],
      last_name: [''],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      password: ['', [Validators.required, Validators.minLength(6)]],
      roleCode: ['USER', [Validators.required]]
    });
  }

  /** Filtered users list computed from search, role, and status signals */
  public filteredUsers = computed(() => {
    let list = this.users();
    const query = this.searchQuery().toLowerCase().trim();
    const role = this.selectedRole();
    const status = this.selectedStatus();

    if (query) {
      list = list.filter(u =>
        (u.first_name && u.first_name.toLowerCase().includes(query)) ||
        (u.last_name && u.last_name.toLowerCase().includes(query)) ||
        (u.email && u.email.toLowerCase().includes(query)) ||
        (u.phone && u.phone.includes(query))
      );
    }

    if (role) {
      list = list.filter(u => u.roles?.includes(role));
    }

    if (status) {
      list = list.filter(u => u.status === status);
    }

    return list;
  });

  /** Search query change handler */
  public onSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  /** Open create user modal */
  public openCreateModal() {
    this.createForm.reset({ roleCode: 'USER' });
    this.showCreateModal.set(true);
  }

  /** Close create user modal */
  public closeCreateModal() {
    this.showCreateModal.set(false);
  }

  /** Submit handler for creating a new staff user */
  public submitCreate() {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const val = this.createForm.value;
    const payload = {
      first_name: val.first_name,
      last_name: val.last_name,
      email: val.email,
      phone: val.phone,
      password: val.password,
      roleCodes: [val.roleCode]
    };

    this.usersService.createUser(payload).subscribe({
      next: () => {
        this.closeCreateModal();
      }
    });
  }

  /** Toggle status handler (ACTIVE <-> INACTIVE) */
  public toggleStatus(user: AppUser) {
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (confirm(`Change status of ${user.first_name} to ${newStatus}?`)) {
      this.usersService.updateUserStatus(user.id, newStatus).subscribe();
    }
  }

  /** Clear all applied filters */
  public clearFilters() {
    this.searchQuery.set('');
    this.selectedRole.set('');
    this.selectedStatus.set('');
  }
}
