import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { AuthenticatedUser } from '../../modules/auth/interfaces/authenticated-user.interface';

/**
 * Global Permissions Guard.
 *
 * Intercepts requests to check if the current user has the necessary
 * permissions specified by @RequirePermission(...).
 *
 * Important:
 * This guard relies on `request.user` being populated by `JwtAuthGuard`.
 * It must be registered *after* `JwtAuthGuard` in the provider chain.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      // If the route doesn't specify any required permissions, allow it.
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
    }>();

    const user = request.user;
    if (!user) {
      // Normally, JwtAuthGuard would throw UnauthorizedException first.
      throw new ForbiddenException('User context is missing');
    }

    // Super Admin bypasses permission checks (SaaS platform-level authority).
    // Library ADMIN/LIBRARY_ADMIN roles are NOT bypassed here: they are
    // tenant-scoped and must carry the required permissions for the endpoint,
    // keeping SaaS vs library responsibilities separate (AGENTS.md §12).
    if (user.roles.includes('SUPER_ADMIN')) {
      return true;
    }

    // Require the user to have ALL specified permissions.
    const hasAllRequired = requiredPermissions.every((perm) =>
      user.permissions.includes(perm),
    );

    if (!hasAllRequired) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
