import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  IsArray,
  IsNumber,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'John', description: 'First name of the user' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  first_name!: string;

  @ApiPropertyOptional({ example: 'Doe', description: 'Last name of the user' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  last_name?: string;

  @ApiProperty({ example: 'john@library.com', description: 'Email address' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(150)
  email!: string;

  @ApiPropertyOptional({ example: '9876543210', description: 'Phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({ example: 'SecurePass123!', description: 'Password' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  password!: string;

  @ApiProperty({
    example: ['STAFF', 'LIBRARIAN'],
    description: 'Role codes to assign',
  })
  @IsArray()
  @IsString({ each: true })
  roleCodes!: string[];

  @ApiPropertyOptional({
    example: 1,
    description: 'Library ID (Super Admin only)',
  })
  @IsOptional()
  @IsNumber()
  library_id?: number;
}
