import { Sidebar } from '../../../shared/components/sidebar/sidebar';
/**
 * seat-detail.ts
 * My Seat — current/latest seat allocation (GET /student/seat).
 */
import { Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { StudentService } from '../../../core/services/student.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-seat-detail',
  standalone: true,
  imports: [Sidebar, CommonModule, DatePipe],
  templateUrl: './seat-detail.html',
  styleUrl: './seat-detail.css'
})
export class SeatDetail implements OnInit {
  public studentService = inject(StudentService);
  public themeService = inject(ThemeService);

  public seat = this.studentService.seat;
  public isLoading = this.studentService.isLoading;

  public hasSeat = computed(() => this.seat() !== null);

  /** Format time-slot "HH:MM:SS" into 12h clock e.g. 09:00 AM */
  public formatTime(value?: string): string {
    if (!value) return '—';
    const [h, m] = value.split(':');
    const hour = Number(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${String(h12).padStart(2, '0')}:${m ?? '00'} ${ampm}`;
  }

  /** Status badge classes */
  public statusClass(status: string): string {
    const s = status?.toUpperCase() ?? '';
    if (s === 'BOOKED' || s === 'CONFIRMED' || s === 'ACTIVE') return 'app-badge-active';
    if (s === 'CANCELLED') return 'app-badge-inactive';
    if (s === 'PENDING') return 'app-badge-maintenance';
    return 'app-badge-occupied';
  }

  ngOnInit() {
    this.studentService.loadSeat().subscribe();
  }
}
