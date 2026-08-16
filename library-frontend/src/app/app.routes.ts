/**
 * app.routes.ts
 * Application ki main routing configuration.
 * Saari routes yahan define hain — lazy loading use kiya gaya hai
 * taaki initial bundle chhota rahe aur performance better ho.
 *
 * Guard hierarchy:
 * - authGuard: Token check karta hai — nahi mila toh /login
 * - roleGuard: Role check karta hai — mismatch hone par /unauthorized
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

  /** Register (branding) page — public self-service library signup */
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then(m => m.Register)
  },

  /** Forgot Password — enter email to receive OTP */
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/forgot-password/forgot-password').then(m => m.ForgotPassword)
  },

  /** Reset Password — enter OTP + new password */
  {
    path: 'reset-password',
    loadComponent: () => import('./features/auth/reset-password/reset-password').then(m => m.ResetPassword)
  },

  /** Unauthorized page — role mismatch hone par dikhta hai */
  {
    path: 'unauthorized',
    loadComponent: () => import('./features/auth/unauthorized/unauthorized').then(m => m.Unauthorized)
  },

  // ===== Super Admin Only Routes =====
  {
    path: 'super-admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['SUPER_ADMIN'] }, // roleGuard is data ko use karta hai
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/super-admin-dashboard/super-admin-dashboard').then(m => m.SuperAdminDashboard)
      },
      {
        path: 'libraries',
        loadComponent: () => import('./features/libraries/libraries-list/libraries-list').then(m => m.LibrariesList)
      },
      {
        path: 'libraries/:id',
        loadComponent: () => import('./features/library-detail/library-detail').then(m => m.LibraryDetail)
      },
      {
        path: 'plans',
        loadComponent: () => import('./features/plans/plans-list/plans-list').then(m => m.PlansList)
      },
      {
        path: 'subscriptions',
        loadComponent: () => import('./features/subscriptions/subscriptions-admin/subscriptions-admin').then(m => m.SubscriptionsAdmin)
      }
    ]
  },

  // ===== Authenticated User Routes (Library Admin + Staff) =====
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard)
  },

  // ===== Users / Staff Management (Phase 7) =====
  {
    path: 'users',
    canActivate: [authGuard],
    loadComponent: () => import('./features/users/users-list/users-list').then(m => m.UsersList)
  },

  // ===== Student Management (Phase 8) =====
  {
    path: 'students',
    canActivate: [authGuard],
    loadComponent: () => import('./features/students/students-list/students-list').then(m => m.StudentsList)
  },

  // ===== Seat Management (Phase 9) =====
  {
    path: 'seats',
    canActivate: [authGuard],
    loadComponent: () => import('./features/seats/seats-list/seats-list').then(m => m.SeatsList)
  },

  // ===== Time Slot Management (Phase 10) =====
  {
    path: 'slots',
    canActivate: [authGuard],
    loadComponent: () => import('./features/time-slots/time-slots-list/time-slots-list').then(m => m.TimeSlotsList)
  },

  // ===== Seat Booking / Allocation (Phase 11) =====
  {
    path: 'bookings',
    canActivate: [authGuard],
    loadComponent: () => import('./features/bookings/bookings-list/bookings-list').then(m => m.BookingsList)
  },

  // ===== Attendance / QR (Phase 12) =====
  {
    path: 'attendance',
    canActivate: [authGuard],
    loadComponent: () => import('./features/attendance/attendance-list/attendance-list').then(m => m.AttendanceList)
  },

  // ===== Fee Plan Management (Phase 13) =====
  {
    path: 'fee-plans',
    canActivate: [authGuard],
    loadComponent: () => import('./features/fee-plans/fee-plans-list/fee-plans-list').then(m => m.FeePlansList)
  },

  // ===== Invoice Management (Phase 14) =====
  {
    path: 'invoices',
    canActivate: [authGuard],
    loadComponent: () => import('./features/invoices/invoices-list/invoices-list').then(m => m.InvoicesList)
  },

  // ===== Payment Management (Phase 15) =====
  {
    path: 'payments',
    canActivate: [authGuard],
    loadComponent: () => import('./features/payments/payments-list/payments-list').then(m => m.PaymentsList)
  },

  // ===== SaaS Subscriptions Management (Phase 16) =====
  {
    path: 'subscriptions',
    canActivate: [authGuard],
    loadComponent: () => import('./features/subscriptions/subscriptions-list/subscriptions-list').then(m => m.SubscriptionsList)
  },

  // ===== Reports & Analytics (Phase 17) =====
  {
    path: 'reports',
    canActivate: [authGuard],
    loadComponent: () => import('./features/reports/reports-list/reports-list').then(m => m.ReportsList)
  },

  // ===== Settings (Phase 18) =====
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () => import('./features/settings/settings-page/settings-page').then(m => m.SettingsPage)
  },

  // ===== RBAC / Roles Management (Phase 3) =====
  {
    path: 'roles',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/roles/roles-list/roles-list').then(m => m.RolesList)
      },
      {
        path: 'create',
        loadComponent: () => import('./features/roles/roles-form/roles-form').then(m => m.RolesForm)
      },
      {
        path: ':id/edit',
        loadComponent: () => import('./features/roles/roles-form/roles-form').then(m => m.RolesForm)
      }
    ]
  },

  // ===== 404 Fallback =====
  {
    path: '**',
    redirectTo: 'login'
  }
];
