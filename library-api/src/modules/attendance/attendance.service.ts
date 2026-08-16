import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  private enforceTenantIsolation(user: AuthenticatedUser) {
    if (!user.library_id) {
      throw new ForbiddenException('Admin user is missing a library context');
    }
    return user.library_id;
  }

  async checkIn(dto: CheckInDto, user: AuthenticatedUser) {
    const libraryId = this.enforceTenantIsolation(user);
    const now = new Date();
    // Normalize date to YYYY-MM-DD for DB Date column matching
    const todayStr = now.toISOString().split('T')[0];
    const today = new Date(todayStr);

    return this.prisma.$transaction(async (tx) => {
      // 1. Validate student exists in this library
      const student = await tx.students.findFirst({
        where: { id: BigInt(dto.student_id), library_id: libraryId },
      });
      if (!student)
        throw new NotFoundException('Student not found in this library');

      // 2. Prevent double check-in
      const activeAttendance = await tx.attendance.findFirst({
        where: {
          student_id: student.id,
          check_out_at: null,
        },
      });

      if (activeAttendance) {
        throw new ConflictException(
          'Student is already checked in and has not checked out today.',
        );
      }

      // 3. Create attendance
      try {
        return await tx.attendance.create({
          data: {
            library_id: libraryId,
            student_id: student.id,
            booking_id: dto.booking_id ? BigInt(dto.booking_id) : null,
            attendance_date: today,
            check_in_at: now,
            check_in_method: dto.check_in_method || 'MANUAL',
            qr_token: dto.qr_token || null,
            remarks: dto.remarks || null,
            attendance_status: 'PRESENT',
            created_by: BigInt(user.id),
          },
        });
      } catch (error: any) {
        // Unique constraint on qr_token
        if (error.code === 'P2002') {
          throw new ConflictException(
            'This QR token has already been used for attendance.',
          );
        }
        throw error;
      }
    });
  }

  async checkOut(studentId: string, dto: CheckOutDto, user: AuthenticatedUser) {
    const libraryId = this.enforceTenantIsolation(user);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const today = new Date(todayStr);

    // Find the active attendance record
    const activeAttendance = await this.prisma.attendance.findFirst({
      where: {
        student_id: BigInt(studentId),
        library_id: libraryId,
        check_out_at: null,
      },
      orderBy: { check_in_at: 'desc' },
    });

    if (!activeAttendance) {
      throw new BadRequestException(
        'No active check-in found for this student today.',
      );
    }

    return this.prisma.attendance.update({
      where: { id: activeAttendance.id },
      data: {
        check_out_at: now,
        remarks: dto.remarks
          ? `${activeAttendance.remarks || ''} | Out: ${dto.remarks}`
          : activeAttendance.remarks,
        updated_by: BigInt(user.id),
        updated_at: now,
      },
    });
  }

  async findAll(
    user: AuthenticatedUser,
    page = 1,
    limit = 50,
    studentId?: string,
    date?: string,
  ) {
    const libraryId = this.enforceTenantIsolation(user);
    const skip = (page - 1) * limit;

    const whereClause: any = { library_id: libraryId };
    if (studentId) whereClause.student_id = BigInt(studentId);
    if (date) {
      const d = new Date(date);
      if (!isNaN(d.getTime())) {
        whereClause.attendance_date = d;
      }
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendance.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { check_in_at: 'desc' },
      }),
      this.prisma.attendance.count({ where: whereClause }),
    ]);

    return { data, total };
  }
}
