import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Request body for POST /api/v1/auth/refresh.
 * The client sends the long-lived refresh token to receive a fresh
 * access+refresh pair (refresh token rotation).
 */
export class RefreshDto {
  @ApiProperty({ description: 'JWT refresh token issued during login/refresh' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
