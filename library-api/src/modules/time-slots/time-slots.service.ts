import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateTimeSlotDto } from './dto/create-time-slot.dto';
import { UpdateTimeSlotDto } from './dto/update-time-slot.dto';

@Injectable()
export class TimeSlotsService {
  constructor(private readonly prisma: PrismaService) {}

  private enforceTenantIsolation(user: AuthenticatedUser) {
    if (!user.library_id) {
      throw new ForbiddenException('Admin user is missing a library context');
    }
    return user.library_id;
  }

  /**
   * Helper to convert HH:mm:ss string to a Date object.
   * Prisma stores time as a timestamp. We can use an arbitrary date like
   * 1970-01-01 and just append the time.
   */
  private parseTime(timeString: string): Date {
    return new Date(`1970-01-01T${timeString}Z`);
  }

  async create(dto: CreateTimeSlotDto, user: AuthenticatedUser) {
    const libraryId = this.enforceTenantIsolation(user);

    try {
      return await this.prisma.time_slots.create({
        data: {
          library_id: libraryId,
          name: dto.name,
          start_time: this.parseTime(dto.start_time),
          end_time: this.parseTime(dto.end_time),
          description: dto.description,
          status: 'ACTIVE',
          created_by: BigInt(user.id),
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(`Time slot '${dto.name}' already exists`);
      }
      throw error;
    }
  }

  async findAll(user: AuthenticatedUser) {
    const libraryId = this.enforceTenantIsolation(user);

    const slots = await this.prisma.time_slots.findMany({
      where: { library_id: libraryId },
      orderBy: { start_time: 'asc' },
    });

    return { data: slots, total: slots.length };
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const libraryId = this.enforceTenantIsolation(user);
    const slot = await this.prisma.time_slots.findFirst({
      where: { id: BigInt(id), library_id: libraryId },
    });

    if (!slot) {
      throw new NotFoundException('Time slot not found');
    }
    return slot;
  }

  async update(id: string, dto: UpdateTimeSlotDto, user: AuthenticatedUser) {
    await this.findOne(id, user); // Verify exists & tenant boundaries

    const dataToUpdate: any = { updated_by: BigInt(user.id) };
    if (dto.start_time)
      dataToUpdate.start_time = this.parseTime(dto.start_time);
    if (dto.end_time) dataToUpdate.end_time = this.parseTime(dto.end_time);
    if (dto.description !== undefined)
      dataToUpdate.description = dto.description;
    if (dto.status !== undefined) dataToUpdate.status = dto.status;

    return this.prisma.time_slots.update({
      where: { id: BigInt(id) },
      data: dataToUpdate,
    });
  }
}
