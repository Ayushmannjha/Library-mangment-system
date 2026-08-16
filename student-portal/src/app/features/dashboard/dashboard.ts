import { Sidebar } from '../../shared/components/sidebar/sidebar';
/**
 * dashboard.ts
 * Student Portal Dashboard.
 * Profile summary, quick actions (QR check-in, attendance, seat, fees),
 * aur reactive stat cards (attendance days, current seat, dues).
 */
import { Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { StudentService } from '../../core/services/student.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [Sidebar, CommonModule, RouterLink, DatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  public authService = inject(AuthService);
  public studentService = inject(StudentService);
  public themeService = inject(ThemeService);

  /** Signal references to service state */
  public profile = this.studentService.profile;
  public attendance = this.studentService.attendance;
  public seat = this.studentService.seat;
  public invoices = this.studentService.invoices;
  public isLoading = this.studentService.isLoading;
  public currentUser = this.authService.currentUser;

  /** Today's date string for header */
  public currentDate = new Date();

  /** Total days attended (attendance records) */
  public attendanceCount = computed(() => this.attendance().length);

  /** Is the student currently checked in (has an open attendance record)? */
  public checkedInNow = computed(() => this.attendance().some(r => !r.check_out_at));

  /** Latest attendance record (if any) */
  public latestAttendance = computed(() => this.attendance()[0] ?? null);

  /** Allocated seat label */
  public seatLabel = computed(() => this.seat()?.seats?.seat_number ?? null);

  /** Sum of unpaid invoice amounts */
  public duesTotal = computed(() => {
    return this.invoices()
      .filter(i => i.status !== 'PAID')
      .reduce((sum, i) => sum + Number(i.total_amount), 0);
  });

  /** Sum of paid invoice amounts */
  public paidTotal = computed(() => {
    return this.invoices()
      .filter(i => i.status === 'PAID')
      .reduce((sum, i) => sum + Number(i.total_amount), 0);
  });

  ngOnInit() {
    this.studentService.loadProfile().subscribe();
    this.studentService.loadAttendance().subscribe();
    this.studentService.loadSeat().subscribe();
    this.studentService.loadFees().subscribe();
  }

  /** Refresh all dashboard data */
  public refresh() {
    this.studentService.loadProfile().subscribe();
    this.studentService.loadAttendance().subscribe();
    this.studentService.loadSeat().subscribe();
    this.studentService.loadFees().subscribe();
  }
}
