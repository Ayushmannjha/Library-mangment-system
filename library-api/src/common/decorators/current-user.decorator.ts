import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../../modules/auth/interfaces/authenticated-user.interface';

/**
 * Injects the authenticated user context set by JwtAuthGuard into a handler.
 *
 * Why needed: controllers shouldn't re-parse the JWT or re-query the DB for
 * the current user. The guard already resolved it once from the token, so
 * @CurrentUser() just hands over that trusted object.
 *
 * Example: `@CurrentUser() user: AuthenticatedUser`
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user: AuthenticatedUser }>();
    return request.user;
  },
);
