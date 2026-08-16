import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  IsDateString,
  IsIn,
} from 'class-validator';

export class CreateStudentDto {
  @ApiProperty({ example: 'S-2023-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  admission_number!: string;

  @ApiProperty({ example: 'Rahul' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  first_name!: string;

  @ApiPropertyOptional({ example: 'Sharma' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  last_name?: string;

  @ApiPropertyOptional({ example: 'MALE', enum: ['MALE', 'FEMALE', 'OTHER'] })
  @IsOptional()
  @IsIn(['MALE', 'FEMALE', 'OTHER'])
  gender?: string;

  @ApiPropertyOptional({ example: '2000-01-01' })
  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @ApiPropertyOptional({ example: 'rahul@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone!: string;

  @ApiPropertyOptional({ example: '9876543211' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  alternate_phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  pincode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
