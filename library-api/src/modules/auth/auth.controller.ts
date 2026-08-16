import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterLibraryDto } from './dto/register-library.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

/**
 * Thin controller — maps HTTP verb + route to a service call (AGENTS.md
 * Part 2, rule 8). Auth endpoints that must be reachable WITHOUT a token are
 * marked @Public() because the JwtAuthGuard is global.
 */
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Creates a user + assigns the default USER role.',
  })
  async register(@Body() dto: RegisterDto) {
    return {
      message: 'User registered successfully',
      data: await this.authService.register(dto),
    };
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('register-library')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new library + owner admin',
    description:
      'Public self-service signup. Creates the library, its owner admin ' +
      '(ADMIN + USER roles) and a 14-day TRIALING subscription.',
  })
  async registerLibrary(@Body() dto: RegisterLibraryDto) {
    return {
      message: 'Registration submitted successfully. Your account will be activated after administrator confirmation.',
      data: await this.authService.registerLibrary(dto),
    };
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password-reset OTP',
    description:
      'If the email is registered and active, a 6-digit OTP is sent. ' +
      'The response is always the same to prevent email enumeration.',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { message: 'If the email is registered, an OTP has been sent.' };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify OTP and set new password',
    description: 'Validates the 6-digit OTP and updates the account password.',
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.email, dto.otp, dto.new_password);
    return { message: 'Password updated successfully. Please login with your new password.' };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @ApiOperation({
    summary: 'Login',
    description: 'Validates credentials and issues access + refresh JWTs.',
  })
  async login(@Body() dto: LoginDto) {
    return {
      message: 'Login successful',
      data: await this.authService.login(dto),
    };
  }

  @Public()
  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh tokens',
    description:
      'Exchanges a valid refresh token for a new access/refresh pair.',
  })
  async refresh(@Body() dto: RefreshDto) {
    return {
      message: 'Tokens refreshed',
      data: await this.authService.refresh(dto),
    };
  }

  @Get('me')
  @ApiOperation({
    summary: 'Current authenticated user',
    description:
      'Returns the trusted user context resolved by the JwtAuthGuard.',
  })
  me(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Current user fetched successfully',
      data: user,
    };
  }
}
