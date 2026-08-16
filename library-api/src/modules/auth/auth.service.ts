import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { SignOptions } from 'jsonwebtoken';
import * as argon2 from 'argon2';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterLibraryDto } from './dto/register-library.dto';

/**
 * Authentication business logic.
 *
 * Security decisions follow AGENTS.md Part 2 rules 12–15:
 *  - passwords hashed with Argon2id (never plain, never returned)
 *  - JWT secrets/expiries come from env (never hard-coded)
 *  - token payload carries only what authorization needs
 *  - tokens are type-scoped (access vs refresh) so a stolen refresh token
 *    cannot be used as an access token.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.users.findFirst({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.users.create({
      data: {
        email: dto.email,
        first_name: dto.first_name,
        last_name: dto.last_name,
        password_hash: passwordHash,
        library_id: null,
        status: 'ACTIVE',
      },
    });

    // New self-registered users begin with the lowest default role (USER).
    // Role assignment for ADMIN/SUPER_ADMIN happens via RBAC flows later.
    const userRole = await this.prisma.roles.findFirst({
      where: { code: 'USER' },
    });
    if (userRole) {
      await this.prisma.user_roles.create({
        data: { user_id: user.id, role_id: userRole.id },
      });
    }

    // NEVER return the password_hash (AGENTS.md Part 2, rule 51).
    return this.toSafeUser(user);
  }

  /**
   * Registers a brand-new library together with its owner admin account.
   * Runs inside a transaction so a failure cannot leave a half-created
   * library or orphaned user. The new library automatically gets a 14-day
   * TRIALING subscription on the cheapest active plan so it shows up in the
   * super-admin subscriptions view immediately.
   */
  async registerLibrary(dto: RegisterLibraryDto) {
    const existing = await this.prisma.users.findFirst({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await argon2.hash(dto.password);
    const libraryCode = await this.buildUniqueLibraryCode(dto.library_name);
    const cheapestPlan = await this.prisma.subscription_plans.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { price: 'asc' },
    });

    const [user, library, roles] = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.users.create({
        data: {
          email: dto.email,
          first_name: dto.first_name,
          last_name: dto.last_name,
          phone: dto.library_phone ?? null,
          password_hash: passwordHash,
          library_id: null,
          status: 'ACTIVE',
        },
      });

      const newLibrary = await tx.libraries.create({
        data: {
          name: dto.library_name,
          code: libraryCode,
          email: dto.email,
          phone: dto.library_phone,
          city: dto.library_city,
          address: dto.library_address,
          status: 'ACTIVE',
          created_by: newUser.id,
        },
      });

      const updatedUser = await tx.users.update({
        where: { id: newUser.id },
        data: { library_id: newLibrary.id },
      });

      const roleCodes = ['ADMIN', 'USER'];
      const foundRoles = await tx.roles.findMany({
        where: { code: { in: roleCodes } },
      });
      for (const role of foundRoles) {
        await tx.user_roles.create({
          data: { user_id: newUser.id, role_id: role.id },
        });
      }

      if (cheapestPlan) {
        const now = new Date();
        const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        await tx.library_subscriptions.create({
          data: {
            library_id: newLibrary.id,
            plan_id: cheapestPlan.id,
            status: 'TRIALING',
            trial_start_at: now,
            trial_end_at: trialEnd,
            price: 0,
            currency: cheapestPlan.currency,
            created_by: newUser.id,
          },
        });
      }

      return [updatedUser, newLibrary, foundRoles];
    });

    return {
      user: this.toSafeUser(user),
      library: {
        id: library.id.toString(),
        name: library.name,
        code: library.code,
        city: library.city,
        status: library.status,
      },
      roles: roles.map((role) => role.code),
    };
  }

  /** Generates a unique library code from its name, e.g. "SUNRISE-DL" -> "SUNRISE-DL" */
  private async buildUniqueLibraryCode(name: string): Promise<string> {
    const base = name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    const fallback = 'LIB';

    let code = base || fallback;
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = attempt === 0 ? code : `${code}-${attempt + 1}`;
      const clash = await this.prisma.libraries.findUnique({
        where: { code: candidate },
      });
      if (!clash) return candidate;
    }
    return `${code}-${Date.now().toString(36).toUpperCase()}`;
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.users.findFirst({
      where: { email: dto.email },
    });
    if (!user) {
      // Same message for "no user" and "wrong password" so attackers cannot
      // tell which emails exist on the platform.
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is inactive');
    }

    const passwordOk = await argon2.verify(user.password_hash, dto.password);
    if (!passwordOk) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.prisma.users.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    const [accessToken, refreshToken] = await this.issueTokens(user.id);
    return {
      user: this.toSafeUser(user),
      accessToken,
      refreshToken,
    };
  }

  async refresh(dto: RefreshDto) {
    let payload: { sub?: string; type?: string };
    try {
      payload = await this.jwtService.verifyAsync(dto.refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Token is not a refresh token');
    }

    const userId = Number(payload.sub);
    const user = await this.prisma.users.findUnique({
      where: { id: BigInt(userId) },
    });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is inactive or does not exist');
    }

    const [accessToken, refreshToken] = await this.issueTokens(user.id);
    return {
      user: this.toSafeUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Strips security-sensitive fields (password_hash) from a user row before
   * it is placed in an API response. Uses explicit spreads instead of
   * destructuring so future columns cannot accidentally leak.
   */
  private toSafeUser(user: {
    id: bigint;
    email: string | null;
    first_name: string;
    last_name: string | null;
    status: string;
    library_id: bigint | null;
    student_id: bigint | null;
  }) {
    return {
      id: user.id.toString(),
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      status: user.status,
      library_id: user.library_id,
      student_id: user.student_id,
    };
  }

  /**
   * Issues a short-lived access token and a long-lived refresh token.
   * `type` in the payload prevents privilege mixing (an access token cannot
   * be used at /auth/refresh and vice-versa).
   */
  private async issueTokens(userId: bigint): Promise<[string, string]> {
    const secret = this.config.get<string>('JWT_SECRET');
    const accessExpiry: SignOptions['expiresIn'] = (this.config.get<string>(
      'JWT_EXPIRES_IN',
    ) ?? '15m') as SignOptions['expiresIn'];
    const refreshExpiry: SignOptions['expiresIn'] = (this.config.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
    ) ?? '7d') as SignOptions['expiresIn'];

    const common = { sub: userId.toString() };
    const accessToken = await this.jwtService.signAsync(
      { ...common, type: 'access' },
      { secret, expiresIn: accessExpiry },
    );
    const refreshToken = await this.jwtService.signAsync(
      { ...common, type: 'refresh' },
      { secret, expiresIn: refreshExpiry },
    );
    return [accessToken, refreshToken];
  }
}
