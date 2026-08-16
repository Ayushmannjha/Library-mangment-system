import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import type { librariesModel } from '../../../generated/prisma/models/libraries';
import { PrismaService } from '../../database/prisma.service';
import { CreateLibraryDto } from './dto/create-library.dto';
import { UpdateLibraryDto } from './dto/update-library.dto';
import { UpdateLibraryStatusDto } from './dto/update-library-status.dto';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

/**
 * Business logic for the Libraries feature.
 *
 * The `id` column is BigInt, so route params arrive as strings ("1"); every
 * method converts/normalizes them here before touching the database.
 *
 * Lifecycle: the DB has NO `deleted_at` column. Soft "deletion" is modeled
 * via `status = INACTIVE` (see ck_libraries_status in the schema). All read
 * queries therefore filter to `status: 'ACTIVE'` only.
 */
@Injectable()
export class LibrariesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Converts a user-supplied id into a BigInt, rejecting anything that is
   * not a plain number. This prevents crashes and returns a clean 400
   * instead of leaking a Prisma conversion error.
   */
  assertValidId(id: string): bigint {
    if (!/^\d+$/.test(id)) {
      throw new BadRequestException('Invalid library id');
    }
    return BigInt(id);
  }

  private isSuperAdmin(user: AuthenticatedUser): boolean {
    return user.roles.includes('SUPER_ADMIN');
  }

  private enforceTenantIsolation(id: bigint, user: AuthenticatedUser) {
    if (!this.isSuperAdmin(user)) {
      if (user.library_id !== id) {
        throw new ForbiddenException('Access denied to other libraries');
      }
    }
  }

  /**
   * List libraries + total, inside ONE transaction so data and total always
   * agree even if a row is written between the two queries.
   * Super Admin can pass includeInactive=true to also see INACTIVE libraries
   * (needed to re-activate them from the admin portal).
   */
  async findAll(
    user: AuthenticatedUser,
    includeInactive = false,
  ): Promise<{ data: librariesModel[]; total: number }> {
    if (!this.isSuperAdmin(user)) {
      throw new ForbiddenException('Only Super Admin can list all libraries');
    }

    const where = includeInactive ? {} : { status: 'ACTIVE' };

    return this.prisma.$transaction(async (tx) => {
      const [data, total] = await Promise.all([
        tx.libraries.findMany({
          where,
          orderBy: { created_at: 'desc' },
        }),
        tx.libraries.count({ where }),
      ]);
      return { data, total };
    });
  }

  /** Finds ONE library by id (optionally including inactive rows). */
  async findOne(
    id: string,
    user: AuthenticatedUser,
    includeInactive = false,
  ): Promise<librariesModel> {
    const validId = this.assertValidId(id);
    this.enforceTenantIsolation(validId, user);

    const library = await this.prisma.libraries.findFirst({
      where: includeInactive ? { id: validId } : { id: validId, status: 'ACTIVE' },
    });
    if (!library) {
      throw new NotFoundException('Library not found');
    }
    return library;
  }

  /**
   * Admin detail view: library row (any status) + its owner user (ADMIN role
   * bound to the library) + the current active/trialing subscription.
   */
  async getAdminDetail(id: string, user: AuthenticatedUser) {
    if (!this.isSuperAdmin(user)) {
      throw new ForbiddenException('Only Super Admin can view library details');
    }

    const validId = this.assertValidId(id);
    const library = await this.prisma.libraries.findFirst({
      where: { id: validId },
    });
    if (!library) {
      throw new NotFoundException('Library not found');
    }

    const owner = await this.prisma.users.findFirst({
      where: {
        library_id: validId,
        status: 'ACTIVE',
        user_roles_user_roles_user_idTousers: {
          some: { roles: { code: 'ADMIN' } },
        },
      },
      orderBy: { id: 'asc' },
      include: {
        user_roles_user_roles_user_idTousers: {
          include: { roles: true },
        },
      },
    });

    const subscription = await this.prisma.library_subscriptions.findFirst({
      where: {
        library_id: validId,
        status: { in: ['ACTIVE', 'TRIALING'] },
      },
      orderBy: { id: 'desc' },
      include: { subscription_plans: true },
    });

    const now = new Date();
    let subStatus = subscription?.status ?? null;
    let daysLeft: number | null = null;
    if (subscription) {
      const endAt =
        subscription.status === 'TRIALING'
          ? subscription.trial_end_at
          : subscription.end_at;
      if (endAt) {
        daysLeft = Math.ceil(
          (endAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
        );
        if (
          daysLeft < 0 &&
          (subscription.status === 'ACTIVE' || subscription.status === 'TRIALING')
        ) {
          subStatus = 'EXPIRED';
        }
      }
    }

    return {
      library: {
        id: library.id.toString(),
        name: library.name,
        code: library.code,
        email: library.email,
        phone: library.phone,
        address: library.address,
        city: library.city,
        status: library.status,
        created_at: library.created_at,
      },
      owner: owner
        ? {
            id: owner.id.toString(),
            first_name: owner.first_name,
            last_name: owner.last_name,
            email: owner.email,
            phone: owner.phone,
            status: owner.status,
            roles:
              owner.user_roles_user_roles_user_idTousers?.map(
                (ur: any) => ur.roles?.code,
              ) || [],
          }
        : null,
      subscription: subscription
        ? {
            id: subscription.id.toString(),
            plan_id: subscription.plan_id.toString(),
            status: subStatus,
            days_left: daysLeft,
            trial_start_at: subscription.trial_start_at,
            trial_end_at: subscription.trial_end_at,
            start_at: subscription.start_at,
            end_at: subscription.end_at,
            price: Number(subscription.price),
            currency: subscription.currency,
            plan: {
              id: subscription.subscription_plans.id.toString(),
              code: subscription.subscription_plans.code,
              name: subscription.subscription_plans.name,
              price: Number(subscription.subscription_plans.price),
              currency: subscription.subscription_plans.currency,
              billing_cycle: subscription.subscription_plans.billing_cycle,
            },
          }
        : null,
    };
  }

  /** Creates a library from a validated DTO. Duplicate `code` -> P2002 -> 409. */
  async create(dto: CreateLibraryDto, user: AuthenticatedUser) {
    if (!this.isSuperAdmin(user)) {
      throw new ForbiddenException('Only Super Admin can create libraries');
    }

    const {
      owner_first_name,
      owner_last_name,
      owner_email,
      owner_password,
      ...libraryData
    } = dto;

    const passwordHash = await argon2.hash(owner_password);

    return this.prisma.$transaction(async (tx) => {
      // 1. Check if owner email is already taken
      const existingOwner = await tx.users.findFirst({
        where: { email: owner_email },
      });
      if (existingOwner) {
        // We throw ConflictException so the transaction rolls back cleanly.
        // It matches the behavior of AuthService.register.
        throw new ConflictException('Owner email is already registered');
      }

      // 2. Create the library
      const library = await tx.libraries.create({
        data: {
          ...libraryData,
          created_by: BigInt(user.id),
        },
      });

      // 3. Create the owner user
      const ownerUser = await tx.users.create({
        data: {
          first_name: owner_first_name,
          last_name: owner_last_name ?? null,
          email: owner_email,
          password_hash: passwordHash,
          library_id: library.id,
          status: 'ACTIVE',
        },
      });

      // 3. Assign the ADMIN role
      const adminRole = await tx.roles.findFirst({ where: { code: 'ADMIN' } });
      if (!adminRole) {
        throw new InternalServerErrorException('ADMIN role not found in DB');
      }

      await tx.user_roles.create({
        data: {
          user_id: ownerUser.id,
          role_id: adminRole.id,
        },
      });

      return library;
    });
  }

  /**
   * Partial update. Re-fetch first so a missing/deactivated library returns
   * a clean 404, and explicitly refresh updated_at (the DB default only
   * applies on insert).
   */
  async update(id: string, dto: UpdateLibraryDto, user: AuthenticatedUser) {
    const validId = this.assertValidId(id);
    this.enforceTenantIsolation(validId, user);

    const existing = await this.prisma.libraries.findFirst({
      where: { id: validId, status: 'ACTIVE' },
    });
    if (!existing) {
      throw new NotFoundException('Library not found');
    }
    return this.prisma.libraries.update({
      where: { id: existing.id },
      data: { ...dto, updated_at: new Date(), updated_by: BigInt(user.id) },
    });
  }

  /**
   * Activate / deactivate a library (status toggle). Super Admin only, and
   * works on INACTIVE libraries too so an admin can re-activate them.
   */
  async updateStatus(
    id: string,
    dto: UpdateLibraryStatusDto,
    user: AuthenticatedUser,
  ) {
    if (!this.isSuperAdmin(user)) {
      throw new ForbiddenException('Only Super Admin can change library status');
    }

    const validId = this.assertValidId(id);
    const existing = await this.prisma.libraries.findFirst({
      where: { id: validId },
    });
    if (!existing) {
      throw new NotFoundException('Library not found');
    }

    return this.prisma.libraries.update({
      where: { id: existing.id },
      data: {
        status: dto.status,
        updated_at: new Date(),
        updated_by: BigInt(user.id),
      },
    });
  }

  /**
   * SOFT delete via status: sets status = INACTIVE so the row + its audit
   * (created_by/updated_by, FK-linked children) is preserved, but the library
   * disappears from every ACTIVE-filtered read.
   */
  async remove(id: string, user: AuthenticatedUser) {
    if (!this.isSuperAdmin(user)) {
      throw new ForbiddenException('Only Super Admin can delete libraries');
    }

    const validId = this.assertValidId(id);

    const existing = await this.prisma.libraries.findFirst({
      where: { id: validId, status: 'ACTIVE' },
    });
    if (!existing) {
      throw new NotFoundException('Library not found');
    }
    return this.prisma.libraries.update({
      where: { id: existing.id },
      data: {
        status: 'INACTIVE',
        updated_at: new Date(),
        updated_by: BigInt(user.id),
      },
    });
  }
}
