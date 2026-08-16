import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

/**
 * Request body for POST /api/v1/auth/register.
 * Whitelisted + validated by the global ValidationPipe (forbidNonWhitelisted),
 * so unknown fields are rejected automatically.
 */
export class RegisterDto {
  @ApiProperty({ description: 'User email (used as login identifier)' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'User password (hashed with Argon2id, never stored plain)',
    minLength: 8,
    example: 'secret123',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @ApiProperty({ description: 'First name' })
  @IsString()
  @IsNotEmpty()
  first_name!: string;

  @ApiPropertyOptional({ description: 'Last name' })
  @IsOptional()
  @IsString()
  last_name?: string;
}
