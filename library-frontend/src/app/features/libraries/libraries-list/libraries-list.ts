import { Sidebar } from '../../../shared/components/sidebar/sidebar';
/**
 * libraries-list.ts
 * Super Admin Library Management Page Component.
 * Allows searching, filtering, listing, creating, and deactivating libraries.
 */
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LibrariesService, LibraryItem } from '../../../core/services/libraries.service';
import { ThemeService } from '../../../core/services/theme.service';


@Component({
  selector: 'app-libraries-list',
  standalone: true,
  imports: [Sidebar, CommonModule, RouterLink, FormsModule, ReactiveFormsModule, DatePipe, Sidebar],
  templateUrl: './libraries-list.html',
  styleUrl: './libraries-list.css'
})
export class LibrariesList implements OnInit {
  public librariesService = inject(LibrariesService);
  public themeService = inject(ThemeService);
  private fb = inject(FormBuilder);

  /** Signal references to service state */
  public libraries = this.librariesService.libraries;
  public isLoading = this.librariesService.isLoading;
  public totalLibraries = this.librariesService.totalLibraries;

  /** Filter states */
  public searchQuery = signal<string>('');
  public selectedCity = signal<string>('');
  public selectedStatus = signal<string>('');

  /** Create Library Modal Visibility State */
  public showCreateModal = signal<boolean>(false);

  /** Create Library Reactive Form */
  public createForm!: FormGroup;

  constructor() {
    this.initForm();
  }

  ngOnInit() {
    this.librariesService.loadLibraries().subscribe();
  }

  /** Initialize form controls and validators for creating a library and owner */
  private initForm() {
    this.createForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      code: ['', [Validators.required, Validators.pattern(/^[A-Z0-9_-]+$/i)]],
      city: [''],
      address: [''],
      phone: [''],
      email: ['', [Validators.email]],
      owner_first_name: ['', [Validators.required]],
      owner_last_name: [''],
      owner_email: ['', [Validators.required, Validators.email]],
      owner_password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  /** Computed list of unique cities for the dropdown filter */
  public cities = computed(() => {
    const list = this.libraries();
    const citySet = new Set<string>();
    list.forEach(lib => {
      if (lib.city) citySet.add(lib.city);
    });
    return Array.from(citySet);
  });

  /** Computed filtered libraries based on search, city, and status filters */
  public filteredLibraries = computed(() => {
    let result = this.libraries();
    const query = this.searchQuery().toLowerCase().trim();
    const city = this.selectedCity();
    const status = this.selectedStatus();

    if (query) {
      result = result.filter(lib =>
        lib.name.toLowerCase().includes(query) ||
        lib.code.toLowerCase().includes(query) ||
        (lib.city && lib.city.toLowerCase().includes(query))
      );
    }

    if (city) {
      result = result.filter(lib => lib.city === city);
    }

    if (status) {
      result = result.filter(lib => lib.status === status);
    }

    return result;
  });

  /** Search input handler */
  public onSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  /** Open create modal */
  public openCreateModal() {
    this.createForm.reset();
    this.showCreateModal.set(true);
  }

  /** Close create modal */
  public closeCreateModal() {
    this.showCreateModal.set(false);
  }

  /** Submit handler for creating a new library */
  public submitCreate() {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.librariesService.createLibrary(this.createForm.value).subscribe({
      next: () => {
        this.closeCreateModal();
      }
    });
  }

  /** Deactivate a library */
  public deactivate(lib: LibraryItem) {
    if (confirm(`Are you sure you want to deactivate "${lib.name}"?`)) {
      this.librariesService.deactivateLibrary(lib.id).subscribe();
    }
  }
}
