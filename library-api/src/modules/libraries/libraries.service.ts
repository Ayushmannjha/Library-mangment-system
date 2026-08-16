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
   * List ACTIVE libraries + total, inside ONE transaction so data and total
   * always agree even if a row is written between the two queries.
   */
  async findAll(
    user: AuthenticatedUser,
  ): Promise<{ data: librariesModel[]; total: number }> {
    if (!this.isSuperAdmin(user)) {
      throw new ForbiddenException('Only Super Admin can list all libraries');
    }

    return this.prisma.$transaction(async (tx) => {
      const [data, total] = await Promise.all([
        tx.libraries.findMany({
          where: { status: 'ACTIVE' },
          orderBy: { created_at: 'desc' },
        }),
        tx.libraries.count({ where: { status: 'ACTIVE' } }),
      ]);
      return { data, total };
    });
  }

  /** Finds ONE active library by id. */
  async findOne(id: string, user: AuthenticatedUser): Promise<librariesModel> {
    const validId = this.assertValidId(id);
    this.enforceTenantIsolation(validId, user);

    const library = await this.prisma.libraries.findFirst({
      where: { id: validId, status: 'ACTIVE' },
    });
    if (!library) {
      throw new NotFoundException('Library not found');
    }
    return library;
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
