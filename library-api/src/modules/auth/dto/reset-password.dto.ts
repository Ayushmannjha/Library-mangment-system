import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

/**
 * POST /api/v1/auth/reset-password
 * Verifies the OTP and sets a new password.
 */
export class ResetPasswordDto {
  @ApiProperty({ description: 'Account email address' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ description: '6-digit OTP received via email', example: '482916' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'OTP must be exactly 6 digits' })
  otp!: string;

  @ApiProperty({ description: 'New password (min 8 chars)', minLength: 8 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  new_password!: string;
}
