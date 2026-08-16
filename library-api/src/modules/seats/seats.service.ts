import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateSeatDto } from './dto/create-seat.dto';
import { UpdateSeatDto } from './dto/update-seat.dto';
import { BulkCreateSeatsDto } from './dto/bulk-create-seats.dto';

@Injectable()
export class SeatsService {
  constructor(private readonly prisma: PrismaService) {}

  private enforceTenantIsolation(user: AuthenticatedUser) {
    if (!user.library_id) {
      throw new ForbiddenException('Admin user is missing a library context');
    }
    return user.library_id;
  }

  async create(dto: CreateSeatDto, user: AuthenticatedUser) {
    const libraryId = this.enforceTenantIsolation(user);

    try {
      return await this.prisma.seats.create({
        data: {
          library_id: libraryId,
          seat_number: dto.seat_number,
          name: dto.name,
          description: dto.description,
          floor: dto.floor,
          section: dto.section,
          status: 'ACTIVE',
          created_by: BigInt(user.id),
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          `Seat number '${dto.seat_number}' already exists`,
        );
      }
      throw error;
    }
  }

  async bulkCreate(dto: BulkCreateSeatsDto, user: AuthenticatedUser) {
    const libraryId = this.enforceTenantIsolation(user);

    const seatData: any[] = [];
    for (let i = 0; i < dto.count; i++) {
      seatData.push({
        library_id: libraryId,
        seat_number: `${dto.prefix}${dto.start_number + i}`,
        floor: dto.floor,
        section: dto.section,
        status: 'ACTIVE',
        created_by: BigInt(user.id),
      });
    }

    try {
      // createMany supports skipDuplicates or just fails on unique constraint
      const result = await this.prisma.seats.createMany({
        data: seatData,
        skipDuplicates: false, // We want it to fail if they try to overlap existing
      });
      return {
        count: result.count,
        message: `Successfully generated ${result.count} seats.`,
      };
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'Bulk generation overlaps with existing seat numbers. Operation aborted.',
        );
      }
      throw error;
    }
  }

  async findAll(
    user: AuthenticatedUser,
    page = 1,
    limit = 50,
    floor?: string,
    section?: string,
    date?: string,
    timeSlotId?: string,
  ) {
    const libraryId = this.enforceTenantIsolation(user);
    const skip = (page - 1) * limit;

    const whereClause: any = { library_id: libraryId };
    if (floor) whereClause.floor = floor;
    if (section) whereClause.section = section;

    const bookingWhere: any = { library_id: libraryId, status: 'BOOKED' };
    if (date) {
      const d = new Date(date);
      if (!isNaN(d.getTime())) {
        bookingWhere.booking_date = d;
      }
    }
    if (timeSlotId && timeSlotId !== 'all') {
      bookingWhere.time_slot_id = BigInt(timeSlotId);
    }

    const [seats, total, activeBookings] = await this.prisma.$transaction([
      this.prisma.seats.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { id: 'asc' },
      }),
      this.prisma.seats.count({ where: whereClause }),
      this.prisma.seat_bookings.findMany({
        where: bookingWhere,
        select: {
          id: true,
          seat_id: true,
          time_slot_id: true,
          booking_date: true,
          students: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              admission_number: true,
            },
          },
        },
      }),
    ]);

    const bookingsBySeatId = new Map<string, any[]>();
    for (const b of activeBookings) {
      const sId = b.seat_id.toString();
      if (!bookingsBySeatId.has(sId)) {
        bookingsBySeatId.set(sId, []);
      }
      bookingsBySeatId.get(sId)!.push({
        id: b.id.toString(),
        time_slot_id: b.time_slot_id.toString(),
        student_id: b.students.id.toString(),
        student_name:
          `${b.students.first_name} ${b.students.last_name || ''}`.trim(),
        admission_number: b.students.admission_number,
      });
    }

    const enrichedSeats = seats.map((seat) => {
      const seatBookings = bookingsBySeatId.get(seat.id.toString()) || [];
      const isOccupied = seatBookings.length > 0;
      return {
        ...seat,
        status:
          seat.status === 'MAINTENANCE'
            ? 'MAINTENANCE'
            : isOccupied
              ? 'OCCUPIED'
              : 'ACTIVE',
        slot_bookings: seatBookings,
      };
    });

    return { data: enrichedSeats, total };
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const libraryId = this.enforceTenantIsolation(user);
    const seat = await this.prisma.seats.findFirst({
      where: { id: BigInt(id), library_id: libraryId },
    });

    if (!seat) {
      throw new NotFoundException('Seat not found');
    }
    return seat;
  }

  async update(id: string, dto: UpdateSeatDto, user: AuthenticatedUser) {
    await this.findOne(id, user); // Verify exists & tenant boundaries
    return this.prisma.seats.update({
      where: { id: BigInt(id) },
      data: {
        ...dto,
        updated_by: BigInt(user.id),
      },
    });
  }
}
