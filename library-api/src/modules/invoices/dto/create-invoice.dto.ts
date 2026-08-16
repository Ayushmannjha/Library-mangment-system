import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvoiceDto {
  @ApiProperty({ example: '1' })
  @IsString()
  @IsNotEmpty()
  student_id!: string;

  @ApiPropertyOptional({ example: '1', description: 'Optional fee plan ID' })
  @IsOptional()
  @IsString()
  fee_plan_id?: string;

  @ApiPropertyOptional({ example: 'INV-2023-0001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  invoice_number?: string;

  @ApiPropertyOptional({ example: '2023-12-31' })
  @IsOptional()
  @IsDateString()
  due_date?: string;

  @ApiPropertyOptional({ example: 'Monthly subscription fee' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 1000.0,
    description: 'Optional if fee_plan_id is provided',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  subtotal?: number;

  @ApiPropertyOptional({ example: 50.0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  discount_amount?: number;

  @ApiPropertyOptional({ example: 18.0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  tax_amount?: number;

  @ApiPropertyOptional({ example: 'INR', default: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string;
}
