import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { PrismaService } from '../../../database/prisma.service';

/**
 * Global authentication guard.
 *
 * Behavior:
 *  - Routes annotated with @Public() are skipped entirely.
 *  - Every other route requires a valid `Authorization: Bearer <accessToken>`.
 *  - The JWT is verified, then the DB row is re-fetched so a suspended or
 *    deleted account loses access immediately (not when the token expires).
 *  - The resolved AuthenticatedUser is attached to `request.user`, which
 *    @CurrentUser() (see common/decorators) injects into handlers.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // @Public() routes (register/login/...) bypass authentication.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string>;
      user?: AuthenticatedUser;
    }>();
    const header = request.headers['authorization'] ?? '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException(
        'Missing or malformed Authorization header',
      );
    }

    let payload: { sub?: string };
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const userId = Number(payload.sub);
    if (!Number.isInteger(userId)) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Load the user row so suspended/deleted accounts lose access immediately,
    // even before the JWT itself expires.
    const userRow = await this.prisma.users.findUnique({
      where: { id: BigInt(userId) },
      select: {
        id: true,
        email: true,
        library_id: true,
        student_id: true,
        status: true,
      },
    });

    if (!userRow || userRow.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is inactive or does not exist');
    }

    // Roles and Permissions are looked up separately.
    const userRoles = await this.prisma.user_roles.findMany({
      where: { user_id: userRow.id },
      select: {
        roles: {
          select: {
            code: true,
            role_permissions: {
              select: {
                permissions: { select: { code: true } },
              },
            },
          },
        },
      },
    });

    const roles: string[] = [];
    const permissionsSet = new Set<string>();

    for (const ur of userRoles) {
      roles.push(ur.roles.code);
      for (const rp of ur.roles.role_permissions) {
        permissionsSet.add(rp.permissions.code);
      }
    }

    request.user = {
      id: userRow.id.toString(),
      email: userRow.email,
      library_id: userRow.library_id,
      student_id: userRow.student_id,
      roles,
      permissions: Array.from(permissionsSet),
    };

    return true;
  }
}
