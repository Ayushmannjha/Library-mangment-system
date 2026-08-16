import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../database/prisma.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private isSuperAdmin(user: AuthenticatedUser): boolean {
    return user.roles.includes('SUPER_ADMIN');
  }

  private resolveTargetLibraryId(
    dtoLibraryId: number | undefined,
    user: AuthenticatedUser,
  ): bigint | null {
    if (this.isSuperAdmin(user)) {
      // Super Admin can create platform users (null) or tenant users
      return dtoLibraryId ? BigInt(dtoLibraryId) : null;
    }
    // Library Admin cannot create cross-tenant users
    if (!user.library_id) {
      throw new ForbiddenException('Admin user is missing a library context');
    }
    return user.library_id;
  }

  private getTenantFilter(user: AuthenticatedUser) {
    if (this.isSuperAdmin(user)) {
      return {}; // No filter, can see all
    }
    return { library_id: user.library_id };
  }

  async create(dto: CreateUserDto, user: AuthenticatedUser) {
    const libraryId = this.resolveTargetLibraryId(dto.library_id, user);

    // Validate roles exist
    const roles = await this.prisma.roles.findMany({
      where: { code: { in: dto.roleCodes } },
    });
    if (roles.length !== dto.roleCodes.length) {
      throw new BadRequestException('One or more invalid role codes provided');
    }

    const passwordHash = await argon2.hash(dto.password);

    return this.prisma.$transaction(async (tx) => {
      // Check duplicate email
      const existing = await tx.users.findFirst({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException('Email is already registered');
      }

      const newUser = await tx.users.create({
        data: {
          first_name: dto.first_name,
          last_name: dto.last_name ?? null,
          email: dto.email,
          phone: dto.phone ?? null,
          password_hash: passwordHash,
          library_id: libraryId,
          status: 'ACTIVE',
        },
      });

      // Assign roles
      if (roles.length > 0) {
        await tx.user_roles.createMany({
          data: roles.map((r) => ({
            user_id: newUser.id,
            role_id: r.id,
          })),
        });
      }

      return this.findOne(newUser.id.toString(), user, tx);
    });
  }

  async findAll(user: AuthenticatedUser) {
    const filter = this.getTenantFilter(user);
    const users = await this.prisma.users.findMany({
      where: filter,
      include: {
        user_roles_user_roles_user_idTousers: {
          include: { roles: true },
        },
      },
      orderBy: { id: 'desc' },
    });

    return {
      data: users.map(this.mapUserResponse),
      total: users.length,
    };
  }

  async findOne(id: string, user: AuthenticatedUser, txClient?: any) {
    const db = txClient ?? this.prisma;
    const filter = this.getTenantFilter(user);
    const targetId = BigInt(id);

    const foundUser = await db.users.findFirst({
      where: { ...filter, id: targetId },
      include: {
        user_roles_user_roles_user_idTousers: {
          include: { roles: true },
        },
      },
    });

    if (!foundUser) {
      throw new NotFoundException('User not found or access denied');
    }

    return this.mapUserResponse(foundUser);
  }

  async update(id: string, dto: UpdateUserDto, user: AuthenticatedUser) {
    await this.findOne(id, user); // Validates existence and tenant boundary
    const updated = await this.prisma.users.update({
      where: { id: BigInt(id) },
      data: dto,
    });
    return this.findOne(updated.id.toString(), user);
  }

  async updateStatus(
    id: string,
    dto: UpdateUserStatusDto,
    user: AuthenticatedUser,
  ) {
    await this.findOne(id, user);
    const updated = await this.prisma.users.update({
      where: { id: BigInt(id) },
      data: { status: dto.status },
    });
    return this.findOne(updated.id.toString(), user);
  }

  async assignRoles(id: string, dto: AssignRolesDto, user: AuthenticatedUser) {
    const targetUser = await this.findOne(id, user);

    const roles = await this.prisma.roles.findMany({
      where: { code: { in: dto.roleCodes } },
    });
    if (roles.length !== dto.roleCodes.length) {
      throw new BadRequestException('One or more invalid role codes provided');
    }

    await this.prisma.$transaction(async (tx) => {
      // Clear existing roles
      await tx.user_roles.deleteMany({
        where: { user_id: BigInt(id) },
      });

      // Insert new roles
      if (roles.length > 0) {
        await tx.user_roles.createMany({
          data: roles.map((r) => ({
            user_id: BigInt(id),
            role_id: r.id,
          })),
        });
      }
    });

    return this.findOne(id, user);
  }

  /** Normalizes the response, stripping password hash and flattening roles */
  private mapUserResponse(userRow: any) {
    const { password_hash, ...safeData } = userRow;
    return {
      ...safeData,
      roles:
        userRow.user_roles_user_roles_user_idTousers?.map(
          (ur: any) => ur.roles?.code,
        ) || [],
    };
  }
}
