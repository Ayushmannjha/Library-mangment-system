import { Sidebar } from '../../../shared/components/sidebar/sidebar';
/**
 * roles-list.ts
 * Roles & Permissions management page.
 * Yahan do panes hain: left mein role list, right mein permission matrix.
 * role-and-permission.html ke design ko follow karta hai.
 */

import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { RolesService } from '../roles.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { Role, Permission } from '../../../core/models/auth.models';
import { ToastService } from '../../../core/services/toast.service';
import { ThemeService } from '../../../core/services/theme.service';

/** Permission matrix ke liye module definition */
interface PermissionModule {
  name: string;   // Display name e.g. "Students"
  icon: string;   // Material Symbol name
  create?: number; // Permission ID for CREATE (null = not applicable)
  read?: number;
  update?: number;
  delete?: number;
}


@Component({
  selector: 'app-roles-list',
  standalone: true,
  imports: [Sidebar, RouterLink, FormsModule, Sidebar],
  templateUrl: './roles-list.html',
  styleUrl: './roles-list.css'
})
export class RolesList implements OnInit {
  private rolesService = inject(RolesService);
  private permissionsService = inject(PermissionsService);
  private toastService = inject(ToastService);
  public themeService = inject(ThemeService);

  // ===== State Signals =====

  /** Saari roles ki list */
  roles = this.rolesService.roles;
  isLoading = this.rolesService.isLoading;

  /** Currently selected role (permission matrix ke liye) */
  selectedRole = signal<Role | null>(null);

  /** Selected role ki permissions ka Set (IDs) — fast lookup ke liye */
  selectedPermissionIds = signal<Set<number>>(new Set());

  /** Role search query */
  roleSearch = '';

  /** Saari available permissions */
  allPermissions = this.permissionsService.allPermissions;

  /** Permission matrix ke modules configuration */
  permissionModules: PermissionModule[] = [
    { name: 'Dashboard', icon: 'dashboard' },
    { name: 'Students', icon: 'group' },
    { name: 'Seats', icon: 'chair' },
    { name: 'Time Slots', icon: 'schedule' },
    { name: 'Bookings', icon: 'event_available' },
    { name: 'Attendance', icon: 'co_present' },
    { name: 'Payments', icon: 'payments' },
    { name: 'Reports', icon: 'analytics' },
    { name: 'Settings', icon: 'settings' },
  ];

  ngOnInit() {
    // Component load hone par roles aur permissions fetch karo
    this.rolesService.loadRoles().subscribe();
    this.permissionsService.loadAllPermissions().subscribe();
  }

  /** Role click hone par use select karo aur uski permissions load karo */
  selectRole(role: Role) {
    this.selectedRole.set(role);

    // Backend se selected role ki permissions fetch karo
    this.permissionsService.getRolePermissions(role.id).subscribe(response => {
      if (response.success) {
        // Permission IDs ka Set banao fast checkbox rendering ke liye
        const ids = new Set(response.data.map((p: Permission) => p.id));
        this.selectedPermissionIds.set(ids);
      }
    });
  }

  /** Permission checkbox toggle karna */
  togglePermission(permId: number) {
    const current = new Set(this.selectedPermissionIds());
    if (current.has(permId)) {
      current.delete(permId);
    } else {
      current.add(permId);
    }
    this.selectedPermissionIds.set(current);
  }

  /** Check karo ki ek permission selected hai ya nahi */
  isPermissionSelected(permId: number | undefined): boolean {
    if (!permId) return false;
    return this.selectedPermissionIds().has(permId);
  }

  /**
   * Permission matrix save karna.
   * Selected permission IDs backend ko bhejta hai.
   */
  savePermissions() {
    const role = this.selectedRole();
    if (!role) return;

    const permIds = Array.from(this.selectedPermissionIds());
    this.permissionsService.updateRolePermissions(role.id, permIds).subscribe({
      next: () => this.toastService.showSuccess('Permissions updated successfully!'),
      error: () => this.toastService.showError('Failed to update permissions.')
    });
  }

  /** Roles ko search query se filter karo */
  get filteredRoles(): Role[] {
    if (!this.roleSearch) return this.roles();
    return this.roles().filter(r =>
      r.name.toLowerCase().includes(this.roleSearch.toLowerCase())
    );
  }

  /** Permission module ka Create permission ID dhundo */
  getPermId(moduleName: string, action: string): number | undefined {
    const key = `${moduleName.toUpperCase().replace(' ', '_')}_${action.toUpperCase()}`;
    const perm = this.allPermissions().find(p => p.name === key);
    return perm?.id;
  }
}
