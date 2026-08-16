import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AttendanceService } from '../attendance/attendance.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@Injectable()
export class StudentPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attendanceService: AttendanceService,
  ) {}

  /**
   * Resolves the student profile linked to the logged-in account. Every
   * portal endpoint is self-scoped through this helper — a student can never
   * pass another student's id because it is never read from the request body.
   */
  private async resolveSelf(user: AuthenticatedUser) {
    if (!user.roles.includes('STUDENT')) {
      throw new ForbiddenException('Student portal is for students only');
    }
    if (!user.student_id) {
      throw new ForbiddenException(
        'No student profile is linked to this account',
      );
    }
    if (!user.library_id) {
      throw new ForbiddenException(
        'Student account is missing a library context',
      );
    }
    const studentId: bigint = user.student_id;
    const libraryId: bigint = user.library_id;
    const student = await this.prisma.students.findFirst({
      where: { id: studentId, library_id: libraryId },
    });
    if (!student) {
      throw new NotFoundException('Student profile not found');
    }
    return student;
  }

  async me(user: AuthenticatedUser) {
    const student = await this.resolveSelf(user);
    const account = await this.prisma.users.findFirst({
      where: { student_id: student.id },
      select: { email: true, status: true, last_login_at: true },
    });
    return { student, account };
  }

  /**
   * Student confirms attendance.
   *
   * Identity comes EXCLUSIVELY from the JWT (users.student_id). The single
   * desk QR code only points to the portal — it carries no student data — so
   * no payload is accepted or verified here.
   */
  async checkIn(user: AuthenticatedUser) {
    const student = await this.resolveSelf(user);
    return this.attendanceService.checkIn(
      {
        student_id: student.id.toString(),
        check_in_method: 'QR',
      },
      user,
    );
  }

  /** Attendance history for the logged-in student (newest first). */
  async myAttendance(user: AuthenticatedUser) {
    const student = await this.resolveSelf(user);
    return this.prisma.attendance.findMany({
      where: { student_id: student.id },
      orderBy: { attendance_date: 'desc' },
    });
  }

  /**
   * The student's current/latest seat allocation — the most recent booking
   * that isn't cancelled, joined with seat and time-slot details.
   */
  async mySeat(user: AuthenticatedUser) {
    const student = await this.resolveSelf(user);
    const booking = await this.prisma.seat_bookings.findFirst({
      where: {
        student_id: student.id,
        status: { not: 'CANCELLED' },
      },
      include: {
        seats: true,
        time_slots: true,
      },
      orderBy: { booking_date: 'desc' },
    });
    return booking;
  }

  /** Invoices and their payments for the logged-in student. */
  async myFees(user: AuthenticatedUser) {
    const student = await this.resolveSelf(user);
    return this.prisma.invoices.findMany({
      where: { student_id: student.id },
      include: {
        fee_plans: true,
        payments: true,
      },
      orderBy: { invoice_date: 'desc' },
    });
  }
}
