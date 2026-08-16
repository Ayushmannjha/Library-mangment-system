import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import type { SignOptions } from 'jsonwebtoken';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

/**
 * Auth feature module.
 *
 * JwtAuthGuard is registered as the GLOBAL guard (APP_GUARD), so every route
 * requires a valid Bearer token unless it opts out with @Public(). Secrets
 * come from ConfigModule (env), never from source code (AGENTS.md Part 2,
 * rule 14).
 *
 * PermissionsGuard runs sequentially after JwtAuthGuard to enforce RBAC.
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        // Default sign/verify expiry; individual tokens override it via the
        // AuthService.issueTokens method (access short, refresh long).
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRES_IN') ??
            '15m') as SignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    // Makes authentication mandatory app-wide without decorating every
    // single controller. Routes opt OUT via the @Public() decorator.
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Enforces permission checks on routes decorated with @RequirePermission(...)
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
