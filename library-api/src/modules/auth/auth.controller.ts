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
