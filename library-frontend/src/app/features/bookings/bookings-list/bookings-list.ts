import { Sidebar } from '../../../shared/components/sidebar/sidebar';
/**
 * bookings-list.ts
 * Seat Booking Management Component.
 * Displays booking dashboard summary, filters, bookings data table with status badges,
 * and a wizard modal for allocating seats to students.
 */
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BookingsService, SeatBooking } from '../../../core/services/bookings.service';
import { StudentsService } from '../../../core/services/students.service';
import { SeatsService } from '../../../core/services/seats.service';
import { TimeSlotsService } from '../../../core/services/time-slots.service';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

import { getLocalTodayDateString, formatIndianDate } from '../../../core/utils/date-utils';

@Component({
  selector: 'app-bookings-list',
  standalone: true,
  imports: [Sidebar, CommonModule, RouterLink, FormsModule, ReactiveFormsModule, DatePipe],
  templateUrl: './bookings-list.html',
  styleUrl: './bookings-list.css'
})
export class BookingsList implements OnInit {
  public bookingsService = inject(BookingsService);
  public studentsService = inject(StudentsService);
  public seatsService = inject(SeatsService);
  public timeSlotsService = inject(TimeSlotsService);
  public authService = inject(AuthService);
  public themeService = inject(ThemeService);
  private fb = inject(FormBuilder);

  public formatIndianDate = formatIndianDate;

  /** Signal references to services */
  public bookings = this.bookingsService.bookings;
  public isLoading = this.bookingsService.isLoading;
  public totalBookings = this.bookingsService.totalBookings;
  public currentPage = this.bookingsService.currentPage;
  public pageLimit = this.bookingsService.pageLimit;

  public students = this.studentsService.students;
  public seats = this.seatsService.seats;
  public slots = this.timeSlotsService.slots;

  /** Filter states */
  public searchQuery = signal<string>('');
  public selectedStatus = signal<string>('');
  public selectedDate = signal<string>('');

  /** New Booking Modal Visibility State */
  public showBookingModal = signal<boolean>(false);

  /** Booking Form */
  public bookingForm!: FormGroup;

  constructor() {
    this.initForm();
  }

  ngOnInit() {
    this.bookingsService.loadBookings().subscribe();
    this.studentsService.loadStudents('', 1, 100).subscribe();
    this.seatsService.loadSeats().subscribe();
    this.timeSlotsService.loadSlots().subscribe();
  }

  /** Initialize form controls and validators */
  private initForm() {
    const today = getLocalTodayDateString();
    this.bookingForm = this.fb.group({
      student_id: ['', [Validators.required]],
      seat_id: ['', [Validators.required]],
      time_slot_id: ['', [Validators.required]],
      booking_date: [today, [Validators.required]]
    });
  }

  /** Helper methods to map IDs to friendly display names */
  public getStudentName(studentId: string | number | undefined): string {
    if (!studentId) return 'N/A';
    const s = this.students().find(item => item.id.toString() === studentId.toString());
    return s ? `${s.first_name} ${s.last_name || ''}`.trim() : `Student #${studentId}`;
  }

  public getSeatNumber(seatId: string | number | undefined): string {
    if (!seatId) return 'N/A';
    const s = this.seats().find(item => item.id.toString() === seatId.toString());
    return s ? `Seat ${s.seat_number}` : `Seat #${seatId}`;
  }

  public getSlotName(slotId: string | number | undefined): string {
    if (!slotId) return 'N/A';
    const s = this.slots().find(item => item.id.toString() === slotId.toString());
    return s ? s.name : `Slot #${slotId}`;
  }

  /** Computed stat summary metrics */
  public totalCount = computed(() => this.totalBookings());
  public activeCount = computed(() => this.bookings().filter(b => b.status === 'BOOKED').length);
  public cancelledCount = computed(() => this.bookings().filter(b => b.status === 'CANCELLED').length);

  /** Computed filtered list */
  public filteredBookings = computed(() => {
    let list = this.bookings();
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.selectedStatus();

    if (query) {
      list = list.filter(b =>
        (b.notes && b.notes.toLowerCase().includes(query)) ||
        (b.id && b.id.toString().includes(query))
      );
    }

    if (status) {
      list = list.filter(b => b.status === status);
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
      this.bookingsService.loadBookings(this.selectedStatus(), this.selectedDate(), this.currentPage() - 1, this.pageLimit()).subscribe();
    }
  }

  public nextPage() {
    const maxPage = Math.ceil(this.totalBookings() / this.pageLimit());
    if (this.currentPage() < maxPage) {
      this.bookingsService.loadBookings(this.selectedStatus(), this.selectedDate(), this.currentPage() + 1, this.pageLimit()).subscribe();
    }
  }

  /** Open booking modal */
  public openBookingModal() {
    const today = getLocalTodayDateString();
    this.bookingForm.reset({
      booking_date: today
    });
    this.showBookingModal.set(true);
  }

  /** Close booking modal */
  public closeBookingModal() {
    this.showBookingModal.set(false);
  }

  /** Submit handler for new booking */
  public submitBooking() {
    if (this.bookingForm.invalid) {
      this.bookingForm.markAllAsTouched();
      return;
    }

    this.bookingsService.createBooking(this.bookingForm.value).subscribe({
      next: () => {
        this.seatsService.loadSeats().subscribe();
        this.closeBookingModal();
      }
    });
  }

  /** Cancel booking handler */
  public cancelBooking(booking: SeatBooking) {
    if (confirm(`Are you sure you want to cancel booking #${booking.id}?`)) {
      this.bookingsService.cancelBooking(booking.id).subscribe({
        next: () => this.seatsService.loadSeats().subscribe()
      });
    }
  }
}
