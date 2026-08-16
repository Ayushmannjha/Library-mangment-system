import { Sidebar } from '../../../shared/components/sidebar/sidebar';
/**
 * attendance-list.ts
 * My Attendance — student's own attendance history (GET /student/attendance).
 */
import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { StudentService } from '../../../core/services/student.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-attendance-list',
  standalone: true,
  imports: [Sidebar, CommonModule, DatePipe],
  templateUrl: './attendance-list.html',
  styleUrl: './attendance-list.css'
})
export class AttendanceList implements OnInit {
  public studentService = inject(StudentService);
  public themeService = inject(ThemeService);

  public records = this.studentService.attendance;
  public isLoading = this.studentService.isLoading;

  /** Filter states */
  public searchQuery = signal<string>('');

  /** Stats */
  public totalDays = computed(() => this.records().length);
  public presentNow = computed(() => this.records().filter(r => !r.check_out_at).length);
  public completedCount = computed(() => this.records().filter(r => !!r.check_out_at).length);

  /** Computed filtered list (by date / status) */
  public filteredRecords = computed(() => {
    let list = this.records();
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      list = list.filter(r =>
        (r.attendance_date && r.attendance_date.toLowerCase().includes(query)) ||
        (r.attendance_status && r.attendance_status.toLowerCase().includes(query)) ||
        (r.check_in_method && r.check_in_method.toLowerCase().includes(query))
      );
    }
    return list;
  });

  ngOnInit() {
    this.studentService.loadAttendance().subscribe();
  }

  /** Search input handler */
  public onSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  /** Status badge classes helper */
  public statusClass(status: string): string {
    const s = status?.toUpperCase() ?? '';
    if (s === 'PRESENT' || s === 'ACTIVE') return 'app-badge-active';
    if (s === 'ABSENT') return 'app-badge-inactive';
    return 'app-badge-maintenance';
  }
}
