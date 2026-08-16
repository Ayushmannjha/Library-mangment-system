import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSubscriptionPlanDto {
  @ApiProperty({ example: 'PLAN-BASIC' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @ApiProperty({ example: 'Basic Plan' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'Includes 50 seats' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 4999.0 })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  price!: number;

  @ApiPropertyOptional({ example: 'INR', default: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'MONTHLY', default: 'MONTHLY' })
  @IsOptional()
  @IsString()
  billing_cycle?: string;
}
