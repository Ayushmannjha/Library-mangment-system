import { Sidebar } from '../../../shared/components/sidebar/sidebar';
/**
 * time-slots-list.ts
 * Time Slot Management Component.
 * Allows viewing, creating, editing, and toggling status of custom library operational time slots.
 */
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TimeSlotsService, TimeSlot } from '../../../core/services/time-slots.service';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-time-slots-list',
  standalone: true,
  imports: [Sidebar, CommonModule, RouterLink, FormsModule, ReactiveFormsModule, DatePipe],
  templateUrl: './time-slots-list.html',
  styleUrl: './time-slots-list.css'
})
export class TimeSlotsList implements OnInit {
  public timeSlotsService = inject(TimeSlotsService);
  public authService = inject(AuthService);
  public themeService = inject(ThemeService);
  private fb = inject(FormBuilder);

  /** Signal references to service state */
  public slots = this.timeSlotsService.slots;
  public isLoading = this.timeSlotsService.isLoading;
  public totalSlots = this.timeSlotsService.totalSlots;

  /** Filter states */
  public searchQuery = signal<string>('');
  public selectedStatus = signal<string>('');

  /** Create/Edit Modal Visibility State */
  public showModal = signal<boolean>(false);
  public editingSlot = signal<TimeSlot | null>(null);

  /** Slot Form */
  public slotForm!: FormGroup;

  constructor() {
    this.initForm();
  }

  ngOnInit() {
    this.timeSlotsService.loadSlots().subscribe();
  }

  /** Initialize form controls and validators */
  private initForm() {
    this.slotForm = this.fb.group({
      name: ['', [Validators.required]],
      start_time: ['08:00', [Validators.required]],
      end_time: ['14:00', [Validators.required]],
      description: ['']
    });
  }

  /** Filtered slots computed from search and status signals */
  public filteredSlots = computed(() => {
    let list = this.slots();
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.selectedStatus();

    if (query) {
      list = list.filter(s =>
        s.name.toLowerCase().includes(query) ||
        (s.description && s.description.toLowerCase().includes(query))
      );
    }

    if (status) {
      list = list.filter(s => s.status === status);
    }

    return list;
  });

  /** Search input handler */
  public onSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  /** Open modal for creating a new slot */
  public openCreateModal() {
    this.editingSlot.set(null);
    this.slotForm.reset({ start_time: '08:00', end_time: '14:00' });
    this.showModal.set(true);
  }

  /** Format time string for clean display without timezone shifting (e.g. 08:00 -> 8:00 AM) */
  public formatTimeDisplay(timeStr: string): string {
    if (!timeStr) return '';
    const cleanTime = timeStr.includes('T') ? timeStr.split('T')[1].substring(0, 5) : timeStr.substring(0, 5);
    const parts = cleanTime.split(':');
    let h = parseInt(parts[0], 10);
    if (isNaN(h)) return timeStr;
    const m = parts[1] || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  }

  /** Open modal for editing an existing slot */
  public openEditModal(slot: TimeSlot) {
    this.editingSlot.set(slot);
    
    // Parse time strings HH:mm:ss -> HH:mm without UTC offset shift
    const startTimeStr = slot.start_time ? (slot.start_time.includes('T') ? slot.start_time.split('T')[1].substring(0, 5) : slot.start_time.substring(0, 5)) : '08:00';
    const endTimeStr = slot.end_time ? (slot.end_time.includes('T') ? slot.end_time.split('T')[1].substring(0, 5) : slot.end_time.substring(0, 5)) : '14:00';

    this.slotForm.patchValue({
      name: slot.name,
      start_time: startTimeStr,
      end_time: endTimeStr,
      description: slot.description ?? ''
    });
    this.showModal.set(true);
  }

  /** Close modal */
  public closeModal() {
    this.showModal.set(false);
    this.editingSlot.set(null);
  }

  /** Submit handler for create/edit */
  public submitForm() {
    if (this.slotForm.invalid) {
      this.slotForm.markAllAsTouched();
      return;
    }

    const val = this.slotForm.value;
    // Format times to HH:mm:ss for backend
    const payload = {
      name: val.name,
      start_time: val.start_time.length === 5 ? `${val.start_time}:00` : val.start_time,
      end_time: val.end_time.length === 5 ? `${val.end_time}:00` : val.end_time,
      description: val.description
    };

    const currentSlot = this.editingSlot();
    if (currentSlot) {
      this.timeSlotsService.updateSlot(currentSlot.id, payload).subscribe({
        next: () => this.closeModal()
      });
    } else {
      this.timeSlotsService.createSlot(payload).subscribe({
        next: () => this.closeModal()
      });
    }
  }

  /** Toggle status handler (ACTIVE <-> INACTIVE) */
  public toggleStatus(slot: TimeSlot) {
    const newStatus = slot.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (confirm(`Change status of "${slot.name}" to ${newStatus}?`)) {
      this.timeSlotsService.updateSlot(slot.id, { status: newStatus }).subscribe();
    }
  }
}
