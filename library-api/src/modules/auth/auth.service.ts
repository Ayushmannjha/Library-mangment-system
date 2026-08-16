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
