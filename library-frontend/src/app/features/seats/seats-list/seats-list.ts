import { Sidebar } from '../../../shared/components/sidebar/sidebar';
/**
 * seats-list.ts
 * Seat Management Component.
 * Displays interactive seating layout grid, stat summary cards,
 * single seat creation modal, and bulk seat generator modal.
 */
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StudentsService } from '../../../core/services/students.service';
import { BookingsService } from '../../../core/services/bookings.service';
import { SlotBookingInfo, SeatsService, Seat } from '../../../core/services/seats.service';
import { TimeSlotsService } from '../../../core/services/time-slots.service';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

import { getLocalTodayDateString, formatIndianDate } from '../../../core/utils/date-utils';

@Component({
  selector: 'app-seats-list',
  standalone: true,
  imports: [Sidebar, CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  templateUrl: './seats-list.html',
  styleUrl: './seats-list.css'
})
export class SeatsList implements OnInit {
  public seatsService = inject(SeatsService);
  public timeSlotsService = inject(TimeSlotsService);
  public studentsService = inject(StudentsService);
  public bookingsService = inject(BookingsService);
  public authService = inject(AuthService);
  public themeService = inject(ThemeService);
  private fb = inject(FormBuilder);

  /** Date formatter helper for template */
  public formatIndianDate = formatIndianDate;

  /** Signal references to service state */
  public seats = this.seatsService.seats;
  public slots = this.timeSlotsService.slots;
  public students = this.studentsService.students;
  public isLoading = this.seatsService.isLoading;
  public totalSeats = this.seatsService.totalSeats;

  /** Filter states */
  public searchQuery = signal<string>('');
  public selectedFloor = signal<string>('');
  public selectedSection = signal<string>('');
  public selectedDate = signal<string>(getLocalTodayDateString());
  public selectedTimeSlotId = signal<string>('all');

  /** Modal visibility states */
  public showCreateModal = signal<boolean>(false);
  public showBulkModal = signal<boolean>(false);
  public showScheduleModal = signal<boolean>(false);
  public showQuickBookModal = signal<boolean>(false);

  /** Selected seat & slot for schedule / quick booking */
  public selectedSeat = signal<Seat | null>(null);
  public targetSlotId = signal<string>('');

  /** Form groups */
  public createForm!: FormGroup;
  public bulkForm!: FormGroup;
  public quickBookForm!: FormGroup;

  constructor() {
    this.initForms();
  }

  ngOnInit() {
    this.timeSlotsService.loadSlots().subscribe();
    this.studentsService.loadStudents('', 1, 100).subscribe();
    this.reloadSeatsWithFilters();
  }

  public reloadSeatsWithFilters() {
    this.seatsService.loadSeats(
      this.selectedFloor(),
      this.selectedSection(),
      this.selectedDate(),
      this.selectedTimeSlotId()
    ).subscribe();
  }

  /** Initialize form controls */
  private initForms() {
    this.createForm = this.fb.group({
      seat_number: ['', [Validators.required]],
      name: [''],
      floor: ['Floor 1'],
      section: ['Main Wing'],
      description: ['']
    });

    this.bulkForm = this.fb.group({
      prefix: ['S-', [Validators.required]],
      start_number: [1, [Validators.required, Validators.min(1)]],
      count: [20, [Validators.required, Validators.min(1), Validators.max(200)]],
      floor: ['Floor 1'],
      section: ['Main Wing']
    });

    this.quickBookForm = this.fb.group({
      student_id: ['', [Validators.required]],
      seat_id: ['', [Validators.required]],
      time_slot_id: ['', [Validators.required]],
      booking_date: [this.selectedDate(), [Validators.required]]
    });
  }

  /** Open seat slot schedule modal on seat card click */
  public openSeatSchedule(seat: Seat) {
    this.selectedSeat.set(seat);
    this.showScheduleModal.set(true);
  }

  public closeSeatSchedule() {
    this.showScheduleModal.set(false);
    this.selectedSeat.set(null);
  }

  /** Helper to find booking for a specific slot on a seat */
  public getBookingForSlot(seat: Seat | null, slotId: string): SlotBookingInfo | undefined {
    if (!seat || !seat.slot_bookings) return undefined;
    return seat.slot_bookings.find(b => b.time_slot_id === slotId);
  }

  /** Open quick booking modal for a free slot */
  public openQuickBook(seat: Seat, slotId: string) {
    this.selectedSeat.set(seat);
    this.targetSlotId.set(slotId);
    this.quickBookForm.patchValue({
      seat_id: seat.id,
      time_slot_id: slotId,
      booking_date: this.selectedDate()
    });
    this.showQuickBookModal.set(true);
  }

  public closeQuickBook() {
    this.showQuickBookModal.set(false);
  }

  /** Submit quick booking */
  public submitQuickBook() {
    if (this.quickBookForm.invalid) {
      this.quickBookForm.markAllAsTouched();
      return;
    }

    this.bookingsService.createBooking(this.quickBookForm.value).subscribe({
      next: () => {
        this.closeQuickBook();
        this.closeSeatSchedule();
        this.reloadSeatsWithFilters();
      }
    });
  }

  /** Computed metrics summary */
  public totalCount = computed(() => this.seats().length);
  public availableCount = computed(() => this.seats().filter(s => s.status === 'ACTIVE').length);
  public occupiedCount = computed(() => this.seats().filter(s => s.status === 'OCCUPIED').length);
  public maintenanceCount = computed(() => this.seats().filter(s => s.status === 'MAINTENANCE' || s.status === 'INACTIVE').length);

  /** Computed list of unique floors for filter dropdown */
  public floors = computed(() => {
    const list = this.seats();
    const set = new Set<string>();
    list.forEach(s => { if (s.floor) set.add(s.floor); });
    return Array.from(set);
  });

  /** Computed list of unique sections for filter dropdown */
  public sections = computed(() => {
    const list = this.seats();
    const set = new Set<string>();
    list.forEach(s => { if (s.section) set.add(s.section); });
    return Array.from(set);
  });

  /** Computed filtered seat list */
  public filteredSeats = computed(() => {
    let list = this.seats();
    const query = this.searchQuery().toLowerCase().trim();
    const floor = this.selectedFloor();
    const section = this.selectedSection();

    if (query) {
      list = list.filter(s =>
        s.seat_number.toLowerCase().includes(query) ||
        (s.name && s.name.toLowerCase().includes(query)) ||
        (s.section && s.section.toLowerCase().includes(query))
      );
    }

    if (floor) {
      list = list.filter(s => s.floor === floor);
    }

    if (section) {
      list = list.filter(s => s.section === section);
    }

    return list;
  });

  /** Search input handler */
  public onSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  /** Date filter change handler */
  public onDateChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.selectedDate.set(value);
    this.reloadSeatsWithFilters();
  }

  /** Time slot filter change handler */
  public onTimeSlotChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedTimeSlotId.set(value);
    this.reloadSeatsWithFilters();
  }

  /** Modal triggers */
  public openCreateModal() {
    this.createForm.reset({ floor: 'Floor 1', section: 'Main Wing' });
    this.showCreateModal.set(true);
  }

  public closeCreateModal() {
    this.showCreateModal.set(false);
  }

  public openBulkModal() {
    this.bulkForm.reset({ prefix: 'S-', start_number: 1, count: 20, floor: 'Floor 1', section: 'Main Wing' });
    this.showBulkModal.set(true);
  }

  public closeBulkModal() {
    this.showBulkModal.set(false);
  }

  /** Submit handlers */
  public submitCreate() {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.seatsService.createSeat(this.createForm.value).subscribe({
      next: () => this.closeCreateModal()
    });
  }

  public submitBulk() {
    if (this.bulkForm.invalid) {
      this.bulkForm.markAllAsTouched();
      return;
    }

    this.seatsService.bulkCreateSeats(this.bulkForm.value).subscribe({
      next: () => this.closeBulkModal()
    });
  }

  /** Toggle maintenance / active status on seat click */
  public toggleSeatMaintenance(seat: Seat) {
    const newStatus = seat.status === 'MAINTENANCE' ? 'ACTIVE' : 'MAINTENANCE';
    if (confirm(`Toggle seat ${seat.seat_number} to ${newStatus}?`)) {
      this.seatsService.updateSeat(seat.id, { status: newStatus }).subscribe();
    }
  }
}
