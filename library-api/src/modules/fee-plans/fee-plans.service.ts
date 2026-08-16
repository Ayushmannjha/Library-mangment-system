import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateFeePlanDto } from './dto/create-fee-plan.dto';
import { UpdateFeePlanDto } from './dto/update-fee-plan.dto';

@Injectable()
export class FeePlansService {
  constructor(private readonly prisma: PrismaService) {}

  private enforceTenantIsolation(user: AuthenticatedUser) {
    if (!user.library_id) {
      throw new ForbiddenException('Admin user is missing a library context');
    }
    return user.library_id;
  }

  async create(dto: CreateFeePlanDto, user: AuthenticatedUser) {
    const libraryId = this.enforceTenantIsolation(user);

    // If time_slot_id is provided, validate it belongs to the library
    if (dto.time_slot_id) {
      const ts = await this.prisma.time_slots.findFirst({
        where: { id: BigInt(dto.time_slot_id), library_id: libraryId },
      });
      if (!ts) {
        throw new NotFoundException('Time slot not found in this library');
      }
    }

    try {
      const plan = await this.prisma.fee_plans.create({
        data: {
          library_id: libraryId,
          name: dto.name,
          code: dto.code,
          description: dto.description || null,
          amount: dto.amount,
          currency: dto.currency || 'INR',
          billing_cycle: dto.billing_cycle || 'MONTHLY',
          duration_days: dto.duration_days || null,
          time_slot_id: dto.time_slot_id ? BigInt(dto.time_slot_id) : null,
          created_by: BigInt(user.id),
        },
      });
      return { ...plan, amount: Number(plan.amount) };
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'A fee plan with this code already exists in your library',
        );
      }
      throw error;
    }
  }

  async findAll(
    user: AuthenticatedUser,
    page = 1,
    limit = 50,
    includeInactive = false,
  ) {
    const libraryId = this.enforceTenantIsolation(user);
    const skip = (page - 1) * limit;

    const whereClause: any = { library_id: libraryId };
    if (!includeInactive) {
      whereClause.status = 'ACTIVE';
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.fee_plans.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.fee_plans.count({ where: whereClause }),
    ]);

    return {
      data: data.map((plan) => ({ ...plan, amount: Number(plan.amount) })),
      total,
    };
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const libraryId = this.enforceTenantIsolation(user);
    const plan = await this.prisma.fee_plans.findFirst({
      where: { id: BigInt(id), library_id: libraryId },
    });
    if (!plan) throw new NotFoundException('Fee plan not found');
    return { ...plan, amount: Number(plan.amount) };
  }

  async update(id: string, dto: UpdateFeePlanDto, user: AuthenticatedUser) {
    const libraryId = this.enforceTenantIsolation(user);
    const plan = await this.findOne(id, user);

    if (dto.time_slot_id) {
      const ts = await this.prisma.time_slots.findFirst({
        where: { id: BigInt(dto.time_slot_id), library_id: libraryId },
      });
      if (!ts) {
        throw new NotFoundException('Time slot not found in this library');
      }
    }

    try {
      const updated = await this.prisma.fee_plans.update({
        where: { id: plan.id },
        data: {
          name: dto.name,
          code: dto.code,
          description: dto.description,
          amount: dto.amount,
          currency: dto.currency,
          billing_cycle: dto.billing_cycle,
          duration_days: dto.duration_days,
          time_slot_id: dto.time_slot_id ? BigInt(dto.time_slot_id) : undefined,
          updated_by: BigInt(user.id),
          updated_at: new Date(),
        },
      });
      return { ...updated, amount: Number(updated.amount) };
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'A fee plan with this code already exists in your library',
        );
      }
      throw error;
    }
  }

  async remove(id: string, user: AuthenticatedUser) {
    const plan = await this.findOne(id, user);
    const deleted = await this.prisma.fee_plans.update({
      where: { id: plan.id },
      data: {
        status: 'INACTIVE',
        updated_by: BigInt(user.id),
        updated_at: new Date(),
      },
    });
    return { ...deleted, amount: Number(deleted.amount) };
  }
}
