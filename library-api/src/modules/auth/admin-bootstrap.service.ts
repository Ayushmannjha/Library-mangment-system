import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { PrismaService } from '../../database/prisma.service';

/**
 * Platform administrator bootstrap.
 *
 * Reads ADMIN_EMAIL / ADMIN_PASSWORD from the environment config file (.env)
 * and, on every startup, upserts that SUPER_ADMIN account (created if missing,
 * password updated if it changed, reactivated if it was disabled) and makes
 * sure the SUPER_ADMIN role carries every permission.
 *
 * This is what makes the administrator userid/password configurable from a
 * config file — change the values in .env and restart the API.
 */
@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const email = this.config.get<string>('ADMIN_EMAIL');
    const password = this.config.get<string>('ADMIN_PASSWORD');

    if (!email || !password) {
      this.logger.warn(
        'ADMIN_EMAIL / ADMIN_PASSWORD not set in env. Skipping admin bootstrap (the seed superadmin still works).',
      );
      return;
    }
    if (password.length < 6) {
      throw new Error('ADMIN_PASSWORD must be at least 6 characters long');
    }

    const role = await this.prisma.roles.findFirst({
      where: { code: 'SUPER_ADMIN' },
    });
    if (!role) {
      throw new Error(
        'SUPER_ADMIN role not found in the database. Run prisma/seed.sql first.',
      );
    }

    // Idempotent: grant every current permission to SUPER_ADMIN so the admin
    // keeps working even if new permission codes are added later.
    await this.grantAllPermissions(role.id);

    const passwordHash = await argon2.hash(password);
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await this.prisma.users.findFirst({
      where: { email: normalizedEmail },
    });

    if (existing) {
      await this.prisma.users.update({
        where: { id: existing.id },
        data: {
          password_hash: passwordHash,
          status: 'ACTIVE',
          // Do NOT touch library_id: a pre-existing account (e.g. the seed
          // superadmin, which doubles as the MAIN library owner) keeps its
          // tenant context. Only brand-new admins are platform-level (null).
          updated_at: new Date(),
        },
      });

      const hasRole = await this.prisma.user_roles.findFirst({
        where: { user_id: existing.id, role_id: role.id },
      });
      if (!hasRole) {
        await this.prisma.user_roles.create({
          data: { user_id: existing.id, role_id: role.id },
        });
      }
      this.logger.log(
        `Platform administrator '${normalizedEmail}' synchronized from env config.`,
      );
    } else {
      const user = await this.prisma.users.create({
        data: {
          email: normalizedEmail,
          first_name: 'Platform',
          last_name: 'Administrator',
          phone: null,
          password_hash: passwordHash,
          library_id: null,
          status: 'ACTIVE',
        },
      });
      await this.prisma.user_roles.create({
        data: { user_id: user.id, role_id: role.id },
      });
      this.logger.log(
        `Platform administrator '${normalizedEmail}' created from env config.`,
      );
    }
  }

  private async grantAllPermissions(roleId: bigint) {
    const permissions = await this.prisma.permissions.findMany();
    await this.prisma.$transaction(
      permissions.map((p) =>
        this.prisma.role_permissions.upsert({
          where: {
            role_id_permission_id: {
              role_id: roleId,
              permission_id: p.id,
            },
          },
          update: {},
          create: { role_id: roleId, permission_id: p.id },
        }),
      ),
    );
  }
}
