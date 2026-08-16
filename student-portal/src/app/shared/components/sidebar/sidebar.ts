import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { StudentService } from '../../../core/services/student.service';
import { ThemeService } from '../../../core/services/theme.service';

/**
 * Sidebar / App shell.
 * Desktop: fixed sidebar on the left (lg+).
 * Mobile: fixed top bar with a hamburger that opens a slide-in drawer.
 * Both share the same navigation.
 */
@Component({
  selector: 'app-student-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
})
export class Sidebar {
  public authService = inject(AuthService);
  public studentService = inject(StudentService);
  public themeService = inject(ThemeService);

  /** Mobile drawer open/closed state */
  public mobileOpen = signal<boolean>(false);

  /** Toggle the mobile drawer */
  toggleMenu(): void {
    this.mobileOpen.update(v => !v);
  }

  /** Close the mobile drawer (backdrop tap / nav link / close button) */
  closeMenu(): void {
    this.mobileOpen.set(false);
  }

  onLogout(): void {
    this.authService.logout();
  }
}
