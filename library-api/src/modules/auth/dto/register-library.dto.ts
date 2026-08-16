import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Request body for POST /api/v1/auth/register-library.
 * Lets a brand-new library owner register their library + admin account
 * in a single public call (whitelisted by the global ValidationPipe).
 */
export class RegisterLibraryDto {
  @ApiProperty({ description: 'Library / brand name', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  library_name!: string;

  @ApiPropertyOptional({ description: 'Library city', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  library_city?: string;

  @ApiPropertyOptional({ description: 'Library phone', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  library_phone?: string;

  @ApiPropertyOptional({ description: 'Library address' })
  @IsOptional()
  @IsString()
  library_address?: string;

  @ApiProperty({ description: 'Owner first name', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  first_name!: string;

  @ApiPropertyOptional({ description: 'Owner last name', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  last_name?: string;

  @ApiProperty({ description: 'Owner email (used as login identifier)' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'Owner password (hashed with Argon2id)',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;
}
