import { Sidebar } from '../../../shared/components/sidebar/sidebar';
/**
 * attendance-list.ts
 * Attendance Management Component.
 * Displays live attendance statistics, trend overview, logs table with active/completed badges,
 * and a manual check-in / check-out modal.
 */
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AttendanceService, AttendanceRecord } from '../../../core/services/attendance.service';
import { StudentsService } from '../../../core/services/students.service';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-attendance-list',
  standalone: true,
  imports: [Sidebar, CommonModule, RouterLink, FormsModule, ReactiveFormsModule, DatePipe],
  templateUrl: './attendance-list.html',
  styleUrl: './attendance-list.css'
})
export class AttendanceList implements OnInit {
  public attendanceService = inject(AttendanceService);
  public studentsService = inject(StudentsService);
  public authService = inject(AuthService);
  public themeService = inject(ThemeService);
  private fb = inject(FormBuilder);

  /** Signal references to service state */
  public records = this.attendanceService.records;
  public isLoading = this.attendanceService.isLoading;
  public totalRecords = this.attendanceService.totalRecords;
  public currentPage = this.attendanceService.currentPage;
  public pageLimit = this.attendanceService.pageLimit;

  public students = this.studentsService.students;

  /** Filter states */
  public searchQuery = signal<string>('');
  public selectedDate = signal<string>('');

  /** Check-in Modal Visibility State */
  public showCheckInModal = signal<boolean>(false);

  /** Check-in Form */
  public checkInForm!: FormGroup;

  constructor() {
    this.initForm();
  }

  ngOnInit() {
    this.attendanceService.loadAttendance().subscribe();
    this.studentsService.loadStudents('', 1, 100).subscribe();
  }

  /** Initialize form controls and validators */
  private initForm() {
    this.checkInForm = this.fb.group({
      student_id: ['', [Validators.required]],
      check_in_method: ['MANUAL'],
      remarks: ['']
    });
  }

  /** Computed stat summary metrics */
  public totalToday = computed(() => this.totalRecords());
  public presentNow = computed(() => this.records().filter(r => !r.check_out_at).length);
  public completedCount = computed(() => this.records().filter(r => !!r.check_out_at).length);

  /** Computed filtered list */
  public filteredRecords = computed(() => {
    let list = this.records();
    const query = this.searchQuery().toLowerCase().trim();

    if (query) {
      list = list.filter(r =>
        (r.remarks && r.remarks.toLowerCase().includes(query)) ||
        (r.student_id && r.student_id.toLowerCase().includes(query))
      );
    }

    return list;
  });

  /** Search & Filter handlers */
  public onSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  public prevPage() {
    if (this.currentPage() > 1) {
      this.attendanceService.loadAttendance(this.selectedDate(), '', this.currentPage() - 1, this.pageLimit()).subscribe();
    }
  }

  public nextPage() {
    const maxPage = Math.ceil(this.totalRecords() / this.pageLimit());
    if (this.currentPage() < maxPage) {
      this.attendanceService.loadAttendance(this.selectedDate(), '', this.currentPage() + 1, this.pageLimit()).subscribe();
    }
  }

  /** Open check-in modal */
  public openCheckInModal() {
    this.checkInForm.reset({
      check_in_method: 'MANUAL'
    });
    this.showCheckInModal.set(true);
  }

  /** Close check-in modal */
  public closeCheckInModal() {
    this.showCheckInModal.set(false);
  }

  /** Submit handler for manual check-in */
  public submitCheckIn() {
    if (this.checkInForm.invalid) {
      this.checkInForm.markAllAsTouched();
      return;
    }

    this.attendanceService.checkIn(this.checkInForm.value).subscribe({
      next: () => this.closeCheckInModal()
    });
  }

  /** Check-out handler */
  public checkOut(record: AttendanceRecord) {
    if (confirm(`Check out student #${record.student_id}?`)) {
      this.attendanceService.checkOut(record.student_id).subscribe();
    }
  }
}
