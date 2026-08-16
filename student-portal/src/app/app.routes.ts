/**
 * app.routes.ts
 * Student Portal ki main routing configuration.
 * Saari routes yahan define hain — lazy loading use kiya gaya hai
 * taaki initial bundle chhota rahe aur performance better ho.
 *
 * Guard hierarchy:
 * - authGuard: Token check karta hai — nahi mila toh /login
 * - roleGuard: Role check karta hai — STUDENT role nahi toh /unauthorized
 */

import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // ===== Public Routes (no guards) =====

  /** Default redirect — / ko /login par bhejta hai */
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  /** Login page — sabke liye accessible */
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.Login)
  },

  /** Unauthorized page — role mismatch hone par dikhta hai */
  {
    path: 'unauthorized',
    loadComponent: () => import('./features/auth/unauthorized/unauthorized').then(m => m.Unauthorized)
  },

  // ===== Student Only Routes (authGuard + roleGuard) =====
  {
    path: 'dashboard',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['STUDENT'] },
    loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard)
  },

  /** QR code — show my QR + scan to check in */
  {
    path: 'qr',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['STUDENT'] },
    loadComponent: () => import('./features/qr/qr-page/qr-page').then(m => m.QrPage)
  },

  /** Attendance history */
  {
    path: 'attendance',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['STUDENT'] },
    loadComponent: () => import('./features/attendance/attendance-list/attendance-list').then(m => m.AttendanceList)
  },

  /** Hand-off target of the single desk QR code (public landing page links here) */
  {
    path: 'attendance/confirm',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['STUDENT'] },
    loadComponent: () => import('./features/attendance/attendance-confirm/attendance-confirm').then(m => m.AttendanceConfirm)
  },

  /** Seat allotment */
  {
    path: 'seat',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['STUDENT'] },
    loadComponent: () => import('./features/seat/seat-detail/seat-detail').then(m => m.SeatDetail)
  },

  /** Fees detail */
  {
    path: 'fees',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['STUDENT'] },
    loadComponent: () => import('./features/fees/fees-list/fees-list').then(m => m.FeesList)
  },

  // ===== 404 Fallback =====
  {
    path: '**',
    redirectTo: 'login'
  }
];
