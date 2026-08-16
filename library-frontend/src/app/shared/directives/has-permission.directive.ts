/**
 * has-permission.directive.ts
 * Permission-based structural directive.
 * Template mein elements ko conditionally show/hide karne ke liye use hota hai.
 *
 * Usage:
 * <button *appHasPermission="'STUDENT_CREATE'">Add Student</button>
 *
 * Permission nahi hone par element DOM se completely remove ho jaata hai.
 * Sirf CSS se hide karna SECURE nahi hota — DOM se hata na zaroori hai.
 */

import { Directive, Input, TemplateRef, ViewContainerRef, inject, OnInit } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Directive({
  selector: '[appHasPermission]', // Template mein *appHasPermission="'PERM_NAME'" se use karo
  standalone: true
})
export class HasPermissionDirective implements OnInit {
  private templateRef = inject(TemplateRef<any>);
  private viewContainerRef = inject(ViewContainerRef);
  private authService = inject(AuthService);

  /** Required permission name — template se pass hota hai */
  @Input('appHasPermission') permission: string = '';

  ngOnInit() {
    this.updateView();
  }

  /**
   * Permission check karta hai aur view update karta hai.
   * SUPER_ADMIN ko sab kuch dikhta hai (bypass).
   * Baaki users ke liye permission specifically check hoti hai.
   */
  private updateView() {
    const user = this.authService.currentUser();
    if (!user) {
      this.viewContainerRef.clear(); // No user — kuch mat dikhao
      return;
    }

    const role = this.authService.primaryRole();

    // SUPER_ADMIN ko har cheez ki permission hoti hai
    if (role === 'SUPER_ADMIN') {
      this.viewContainerRef.createEmbeddedView(this.templateRef);
      return;
    }

    // TODO: Phase 3 mein PermissionsService se actual permissions check hongi
    // Abhi ke liye ADMIN ko sab kuch dikhate hain
    if (role === 'ADMIN') {
      this.viewContainerRef.createEmbeddedView(this.templateRef);
      return;
    }

    // USER role — sirf specific permissions check karo
    // Placeholder: implement with PermissionsService.hasPermission()
    this.viewContainerRef.clear();
  }
}
