import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateSeatBookingDto } from './dto/create-seat-booking.dto';
import { CancelSeatBookingDto } from './dto/cancel-seat-booking.dto';

@Injectable()
export class SeatBookingsService {
  constructor(private readonly prisma: PrismaService) {}

  private enforceTenantIsolation(user: AuthenticatedUser) {
    if (!user.library_id) {
      throw new ForbiddenException('Admin user is missing a library context');
    }
    return user.library_id;
  }

  async create(dto: CreateSeatBookingDto, user: AuthenticatedUser) {
    const libraryId = this.enforceTenantIsolation(user);
    const bookingDate = new Date(dto.booking_date);
    if (isNaN(bookingDate.getTime())) {
      throw new BadRequestException('Invalid booking_date');
    }

    // Wrap everything in a serialized transaction to prevent concurrent race conditions
    return this.prisma.$transaction(async (tx) => {
      // 1. Verify that the student, seat, and time slot all belong to THIS library.
      const student = await tx.students.findFirst({
        where: { id: BigInt(dto.student_id), library_id: libraryId },
      });
      if (!student)
        throw new NotFoundException('Student not found in this library');

      const seat = await tx.seats.findFirst({
        where: { id: BigInt(dto.seat_id), library_id: libraryId },
      });
      if (!seat) throw new NotFoundException('Seat not found in this library');

      const timeSlot = await tx.time_slots.findFirst({
        where: { id: BigInt(dto.time_slot_id), library_id: libraryId },
      });
      if (!timeSlot)
        throw new NotFoundException('Time slot not found in this library');

      // 2. Concurrency Check: Ensure the seat is not already booked on that date and time slot.
      const existingBooking = await tx.seat_bookings.findFirst({
        where: {
          seat_id: seat.id,
          time_slot_id: timeSlot.id,
          booking_date: bookingDate,
          status: 'BOOKED',
        },
      });

      if (existingBooking) {
        throw new ConflictException(
          'This seat is already booked for the selected time slot and date.',
        );
      }

      // 3. Create the booking. Prisma will still enforce the unique constraint
      // [student_id, time_slot_id, booking_date] to prevent double-booking the same student
      // across different seats in the same timeslot.
      try {
        const newBooking = await tx.seat_bookings.create({
          data: {
            library_id: libraryId,
            student_id: student.id,
            seat_id: seat.id,
            time_slot_id: timeSlot.id,
            booking_date: bookingDate,
            status: 'BOOKED',
            created_by: BigInt(user.id),
          },
        });

        // Automatically update the seat status to OCCUPIED
        await tx.seats.update({
          where: { id: seat.id },
          data: { status: 'OCCUPIED' },
        });

        return newBooking;
      } catch (error: any) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'This student already has a booking for the selected time slot and date.',
          );
        }
        throw error;
      }
    });
  }

  async findAll(
    user: AuthenticatedUser,
    page = 1,
    limit = 50,
    studentId?: string,
    seatId?: string,
    status?: string,
    date?: string,
  ) {
    const libraryId = this.enforceTenantIsolation(user);
    const skip = (page - 1) * limit;

    const whereClause: any = { library_id: libraryId };
    if (studentId) whereClause.student_id = BigInt(studentId);
    if (seatId) whereClause.seat_id = BigInt(seatId);
    if (status) whereClause.status = status;
    if (date) {
      const d = new Date(date);
      if (!isNaN(d.getTime())) {
        whereClause.booking_date = d;
      }
    }

    const [bookings, total] = await this.prisma.$transaction([
      this.prisma.seat_bookings.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { booking_date: 'desc' },
      }),
      this.prisma.seat_bookings.count({ where: whereClause }),
    ]);

    return { data: bookings, total };
  }

  async cancel(id: string, dto: CancelSeatBookingDto, user: AuthenticatedUser) {
    const libraryId = this.enforceTenantIsolation(user);

    const booking = await this.prisma.seat_bookings.findFirst({
      where: { id: BigInt(id), library_id: libraryId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== 'BOOKED') {
      throw new BadRequestException(
        `Cannot cancel booking with status: ${booking.status}`,
      );
    }

    const cancelledBooking = await this.prisma.seat_bookings.update({
      where: { id: booking.id },
      data: {
        status: 'CANCELLED',
        cancelled_at: new Date(),
        notes: dto.notes,
        updated_by: BigInt(user.id),
      },
    });

    // Check if there are any remaining active BOOKED entries for this seat
    const activeCount = await this.prisma.seat_bookings.count({
      where: { seat_id: booking.seat_id, status: 'BOOKED' },
    });

    if (activeCount === 0) {
      await this.prisma.seats.update({
        where: { id: booking.seat_id },
        data: { status: 'ACTIVE' },
      });
    }

    return cancelledBooking;
  }
}
