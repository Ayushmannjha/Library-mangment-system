import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { SignOptions } from 'jsonwebtoken';
import * as argon2 from 'argon2';
import { PrismaService } from '../../database/prisma.service';
import { MailerService } from './services/mailer.service';
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
    private readonly mailer: MailerService,
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
   * The library, user and subscription are all created in a PENDING/INACTIVE
   * state. A super-admin must confirm payment via the subscriptions admin
   * to activate the account before the owner can log in.
   */
  async registerLibrary(dto: RegisterLibraryDto) {
    const existing = await this.prisma.users.findFirst({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const plan = await this.prisma.subscription_plans.findFirst({
      where: { id: BigInt(dto.plan_id), status: 'ACTIVE' },
    });
    if (!plan) {
      throw new BadRequestException('Selected subscription plan is not available');
    }

    const passwordHash = await argon2.hash(dto.password);
    const libraryCode = await this.buildUniqueLibraryCode(dto.library_name);

    const [user, library, roles] = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.users.create({
        data: {
          email: dto.email,
          first_name: dto.first_name,
          last_name: dto.last_name,
          phone: dto.library_phone ?? null,
          password_hash: passwordHash,
          library_id: null,
          status: 'INACTIVE',
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
          status: 'INACTIVE',
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

      // Subscription starts as PENDING — awaiting admin payment confirmation.
      await tx.library_subscriptions.create({
        data: {
          library_id: newLibrary.id,
          plan_id: plan.id,
          status: 'PENDING',
          price: plan.price,
          currency: plan.currency,
          created_by: newUser.id,
        },
      });

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
      plan: {
        id: plan.id.toString(),
        name: plan.name,
        price: plan.price.toString(),
        currency: plan.currency,
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
      throw new UnauthorizedException('Your plan request is not active. Please contact the administrator.');
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

    // Fetch user roles for the frontend redirect logic
    const userRoles = await this.prisma.user_roles.findMany({
      where: { user_id: user.id },
      include: { roles: true },
    });
    const roleNames = userRoles.map(ur => ur.roles.code);

    return {
      user: { ...this.toSafeUser(user), roles: roleNames },
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
      throw new UnauthorizedException('Your plan request is not active. Please contact the administrator.');
    }

    const [accessToken, refreshToken] = await this.issueTokens(user.id);
    return {
      user: this.toSafeUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Forgot-password flow step 1.
   * Generates a 6-digit OTP, stores it hashed in `password_resets`, and
   * sends it via email.  Always returns a generic success message so that
   * attackers cannot enumerate registered emails.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.users.findFirst({
      where: { email, status: 'ACTIVE' },
    });

    // Always return silently — never reveal whether the email exists.
    if (!user) return;

    const otp = this.generateOtp();
    const otpHash = await argon2.hash(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.password_resets.create({
      data: {
        user_id: user.id,
        otp_hash: otpHash,
        expires_at: expiresAt,
      },
    });

    const name = user.first_name || 'there';
    await this.mailer.sendMail({
      to: email,
      subject: 'Your Password Reset OTP — Lexicon LMS',
      text: `Hi ${name},\n\nYour one-time password (OTP) is: ${otp}\nIt is valid for 10 minutes.\n\nIf you did not request this, please ignore this email.\n\n— Lexicon LMS Team`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fafafa;border-radius:12px;">
          <h2 style="color:#1a1a1a;margin-bottom:8px;">Password Reset OTP</h2>
          <p style="color:#555;font-size:15px;">Hi ${name},</p>
          <p style="color:#555;font-size:15px;">Your one-time password (OTP) is:</p>
          <p style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#1a1a1a;background:#e8f5e9;display:inline-block;padding:12px 24px;border-radius:8px;margin:12px 0;">${otp}</p>
          <p style="color:#888;font-size:13px;">Valid for 10 minutes. If you did not request this, ignore this email.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
          <p style="color:#aaa;font-size:12px;">Lexicon LMS</p>
        </div>`,
    });
  }

  /**
   * Forgot-password flow step 2.
   * Validates the OTP and sets the new password in a single operation.
   * Throws on any invalid state (expired OTP, wrong OTP, etc.).
   */
  async resetPassword(email: string, otp: string, newPassword: string): Promise<void> {
    const user = await this.prisma.users.findFirst({
      where: { email, status: 'ACTIVE' },
    });
    if (!user) {
      throw new BadRequestException('Invalid or expired reset request');
    }

    // Find the latest unused OTP for this user
    const record = await this.prisma.password_resets.findFirst({
      where: { user_id: user.id, used: false },
      orderBy: { created_at: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('No active OTP found. Please request a new one.');
    }

    // Check expiry
    if (new Date() > record.expires_at) {
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    // Verify OTP
    const otpValid = await argon2.verify(record.otp_hash, otp);
    if (!otpValid) {
      throw new BadRequestException('Invalid OTP. Please check and try again.');
    }

    // Update password and mark OTP as used
    const passwordHash = await argon2.hash(newPassword);
    await this.prisma.$transaction([
      this.prisma.users.update({
        where: { id: user.id },
        data: { password_hash: passwordHash },
      }),
      this.prisma.password_resets.update({
        where: { id: record.id },
        data: { used: true },
      }),
    ]);
  }

  /** Generates a cryptographically random 6-digit OTP (zero-padded). */
  private generateOtp(): string {
    const bytes = new Uint8Array(3);
    // Uses Node's built-in crypto random — no extra dependency needed.
    require('crypto').randomFillSync(bytes);
    const num = (bytes[0] << 16) | (bytes[1] << 8) | bytes[2];
    return String(num % 1_000_000).padStart(6, '0');
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
