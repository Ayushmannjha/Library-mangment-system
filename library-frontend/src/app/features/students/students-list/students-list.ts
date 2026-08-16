import { Sidebar } from '../../../shared/components/sidebar/sidebar';
/**
 * students-list.ts
 * Student Management Page Component.
 * Allows searching, filtering, paginating, adding students, and toggling student status.
 */
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StudentsService, Student } from '../../../core/services/students.service';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-students-list',
  standalone: true,
  imports: [Sidebar, CommonModule, RouterLink, FormsModule, ReactiveFormsModule, DatePipe],
  templateUrl: './students-list.html',
  styleUrl: './students-list.css'
})
export class StudentsList implements OnInit {
  public studentsService = inject(StudentsService);
  public authService = inject(AuthService);
  public themeService = inject(ThemeService);
  private fb = inject(FormBuilder);

  /** Signal references to service state */
  public students = this.studentsService.students;
  public isLoading = this.studentsService.isLoading;
  public totalStudents = this.studentsService.totalStudents;
  public currentPage = this.studentsService.currentPage;
  public pageLimit = this.studentsService.pageLimit;

  /** Filter states */
  public searchQuery = signal<string>('');
  public selectedStatus = signal<string>('');

  /** Create Student Modal Visibility State */
  public showCreateModal = signal<boolean>(false);

  /** Create Student Form */
  public createForm!: FormGroup;

  constructor() {
    this.initForm();
  }

  ngOnInit() {
    this.studentsService.loadStudents().subscribe();
  }

  /** Initialize form controls and validators for creating a student */
  private initForm() {
    const autoAdmissionNum = 'STU-' + Math.floor(100000 + Math.random() * 900000);
    this.createForm = this.fb.group({
      admission_number: [autoAdmissionNum, [Validators.required]],
      first_name: ['', [Validators.required]],
      last_name: [''],
      gender: ['MALE'],
      date_of_birth: [''],
      email: ['', [Validators.email]],
      phone: ['', [Validators.required]],
      address: [''],
      city: [''],
      state: [''],
      pincode: [''],
      notes: ['']
    });
  }

  /** Filtered students computed from search and status signals */
  public filteredStudents = computed(() => {
    let list = this.students();
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.selectedStatus();

    if (query) {
      list = list.filter(s =>
        (s.first_name && s.first_name.toLowerCase().includes(query)) ||
        (s.last_name && s.last_name.toLowerCase().includes(query)) ||
        (s.admission_number && s.admission_number.toLowerCase().includes(query)) ||
        (s.phone && s.phone.includes(query))
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
    // Reload from API with search
    this.studentsService.loadStudents(value, 1, this.pageLimit()).subscribe();
  }

  /** Pagination handlers */
  public prevPage() {
    if (this.currentPage() > 1) {
      this.studentsService.loadStudents(this.searchQuery(), this.currentPage() - 1, this.pageLimit()).subscribe();
    }
  }

  public nextPage() {
    const maxPage = Math.ceil(this.totalStudents() / this.pageLimit());
    if (this.currentPage() < maxPage) {
      this.studentsService.loadStudents(this.searchQuery(), this.currentPage() + 1, this.pageLimit()).subscribe();
    }
  }

  /** Open create modal */
  public openCreateModal() {
    const autoAdmissionNum = 'STU-' + Math.floor(100000 + Math.random() * 900000);
    this.createForm.reset({
      admission_number: autoAdmissionNum,
      gender: 'MALE'
    });
    this.showCreateModal.set(true);
  }

  /** Close create modal */
  public closeCreateModal() {
    this.showCreateModal.set(false);
  }

  /** Submit handler for creating a student */
  public submitCreate() {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.studentsService.createStudent(this.createForm.value).subscribe({
      next: () => {
        this.closeCreateModal();
      }
    });
  }

  /** Toggle status handler (ACTIVE <-> INACTIVE) */
  public toggleStatus(s: Student) {
    const newStatus = s.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (confirm(`Change status of ${s.first_name} to ${newStatus}?`)) {
      this.studentsService.updateStudentStatus(s.id, newStatus).subscribe();
    }
  }
}
