import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

/**
 * POST /api/v1/auth/forgot-password
 * Sends a 6-digit OTP to the given email if the account exists.
 */
export class ForgotPasswordDto {
  @ApiProperty({ description: 'Account email address' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
