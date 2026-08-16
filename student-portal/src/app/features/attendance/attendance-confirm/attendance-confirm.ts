import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Sidebar } from '../../../shared/components/sidebar/sidebar';
import { StudentService } from '../../../core/services/student.service';
import { ThemeService } from '../../../core/services/theme.service';

/**
 * attendance-confirm.ts
 * The hand-off target of the single desk QR code (public landing page at
 * GET /api/v1/attendance links here). Identity is taken from the logged-in
 * portal session; the Submit calls POST /student/attendance with the JWT.
 */
@Component({
  selector: 'app-attendance-confirm',
  standalone: true,
  imports: [Sidebar, CommonModule, RouterLink],
  templateUrl: './attendance-confirm.html',
})
export class AttendanceConfirm implements OnInit {
  public studentService = inject(StudentService);
  public themeService = inject(ThemeService);

  public checkedIn = signal<boolean>(false);
  public resultMessage = signal<string | null>(null);
  public resultType = signal<'success' | 'error'>('success');

  ngOnInit() {
    this.studentService.loadProfile().subscribe();
  }

  /** Submit attendance — token comes from the session, QR carries no data. */
  submit() {
    this.studentService.checkIn().subscribe({
      next: (res) => {
        if (res.success) {
          this.resultType.set('success');
          this.resultMessage.set(
            `Checked in at ${this.formatTime(res.data?.check_in_at)}. Enjoy your study session!`
          );
          this.checkedIn.set(true);
          this.studentService.loadAttendance().subscribe();
        }
      },
    });
  }

  /** Format ISO datetime as a readable local time. */
  private formatTime(iso?: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
