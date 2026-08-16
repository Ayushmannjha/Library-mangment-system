import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSION_KEY = 'require_permission';

/**
 * Decorator to enforce permission checks on a route or controller.
 * The PermissionsGuard will ensure the authenticated user has ALL specified permissions.
 */
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, permissions);
