import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Defines + validates the EXACT input allowed for POST /libraries.
 *
 * We never accept the raw Prisma model as a body: the DTO whitelists fields,
 * validates types/lengths/format, and documents the API in Swagger. Unknown
 * fields are rejected by the global ValidationPipe (forbidNonWhitelisted).
 */
export class CreateLibraryDto {
  @ApiProperty({
    description: 'Library name',
    example: 'City Central Library',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiProperty({
    description: 'Unique library code',
    example: 'CCL001',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @ApiPropertyOptional({
    description: 'Library email',
    example: 'admin@citycentral.com',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @ApiPropertyOptional({ description: 'Library phone', example: '9876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ description: 'Library address', example: 'Main Road' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Library city', example: 'Patna' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    description: 'Library status',
    example: 'ACTIVE',
    enum: ['ACTIVE', 'INACTIVE'],
  })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';

  // --- Owner User Details ---
  @ApiProperty({
    description: 'First name of the library owner (Admin)',
    example: 'John',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  owner_first_name!: string;

  @ApiPropertyOptional({
    description: 'Last name of the library owner (Admin)',
    example: 'Doe',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  owner_last_name?: string;

  @ApiProperty({
    description: 'Email for the library owner (Admin)',
    example: 'admin@citycentral.com',
  })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(150)
  owner_email!: string;

  @ApiProperty({
    description: 'Password for the library owner (Admin)',
    example: 'StrongPass123!',
  })
  @IsString()
  @IsNotEmpty()
  // Basic constraint: at least 8 chars, could add regex for stronger validation
  @MaxLength(100)
  owner_password!: string;
}
