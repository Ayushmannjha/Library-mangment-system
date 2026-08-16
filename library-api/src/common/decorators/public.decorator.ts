import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key used by JwtAuthGuard to decide which routes skip authentication.
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as PUBLIC (no JWT required).
 *
 * Why needed: the global JwtAuthGuard protects every route by default, so
 * login/register and similar open endpoints MUST opt out explicitly with
 * @Public(); everything else stays protected without extra code.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
