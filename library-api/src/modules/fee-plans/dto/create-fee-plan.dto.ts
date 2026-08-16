import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFeePlanDto {
  @ApiProperty({ example: 'Morning Slot Monthly' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ example: 'MORNING-1M' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @ApiPropertyOptional({ example: 'Plan for morning shift 8am to 2pm' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1500.5 })
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  amount!: number;

  @ApiPropertyOptional({ example: 'INR', default: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'MONTHLY', default: 'MONTHLY' })
  @IsOptional()
  @IsString()
  @IsIn(['MONTHLY', 'WEEKLY', 'QUARTERLY', 'YEARLY', 'CUSTOM'])
  billing_cycle?: string;

  @ApiPropertyOptional({
    example: 30,
    description: 'Duration in days for CUSTOM cycles',
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  duration_days?: number;

  @ApiPropertyOptional({ example: '1', description: 'Linked time slot' })
  @IsOptional()
  @IsString()
  time_slot_id?: string;
}
