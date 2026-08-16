/**
 * student.models.ts
 * Student Portal API ke response models.
 * Backend: src/modules/student-portal/ (GET /student/*)
 * BigInt ids JSON mein string ke roop mein aate hain (ResponseInterceptor).
 * Decimal amounts bhi string ke roop mein aate hain — components Number() se convert karte hain.
 */

// ---------- Profile ----------

/** GET /api/v1/student/me → data.student (students table) */
export interface StudentProfile {
  id: string;
  library_id: string;
  admission_number: string;
  first_name: string;
  last_name?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  email?: string | null;
  phone?: string | null;
  alternate_phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  admission_date?: string;
  status: 'ACTIVE' | 'INACTIVE';
  notes?: string | null;
  created_at?: string;
}

/** GET /api/v1/student/me → data.account (users table) */
export interface StudentAccount {
  email: string | null;
  status: string;
  last_login_at: string | null;
}

/** GET /api/v1/student/me → data */
export interface MyProfile {
  student: StudentProfile;
  account: StudentAccount;
}

// ---------- Attendance ----------

/** Attendance record from GET /api/v1/student/attendance */
export interface AttendanceRecord {
  id: string;
  library_id: string;
  student_id: string;
  booking_id?: string | null;
  attendance_date: string;
  check_in_at: string;
  check_out_at?: string | null;
  attendance_status: string;
  check_in_method: string;
  qr_token?: string | null;
  remarks?: string | null;
  created_at?: string;
}

// ---------- Seat ----------

/** GET /api/v1/student/seat → data (seat_booking incl. seats + time_slots) */
export interface SeatBooking {
  id: string;
  library_id: string;
  student_id: string;
  seat_id: string;
  time_slot_id: string;
  booking_date: string;
  status: string;
  allocated_at?: string;
  cancelled_at?: string | null;
  notes?: string | null;
  created_at?: string;
  seats: {
    id: string;
    seat_number: string;
    name?: string | null;
    floor?: string | null;
    section?: string | null;
    status?: string;
  };
  time_slots: {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
    status?: string;
  };
}

// ---------- Fees ----------

/** GET /api/v1/student/fees → data (invoices incl. fee_plans + payments) */
export interface StudentInvoice {
  id: string;
  library_id: string;
  student_id: string;
  fee_plan_id?: string | null;
  invoice_number: string;
  invoice_date: string;
  due_date?: string | null;
  description?: string | null;
  subtotal: string;   // Decimal → string
  discount_amount: string;
  tax_amount: string;
  total_amount: string;
  currency: string;
  status: string;     // e.g. PAID / PENDING / OVERDUE
  created_at?: string;
  fee_plans?: {
    id: string;
    name: string;
    code: string;
    amount: string;
    currency: string;
    billing_cycle: string;
    status?: string;
  } | null;
  payments?: StudentPayment[];
}

export interface StudentPayment {
  id: string;
  invoice_id: string;
  payment_number: string;
  amount: string; // Decimal → string
  currency: string;
  payment_method: string;
  transaction_reference?: string | null;
  payment_date: string;
  status: string;
  notes?: string | null;
}
