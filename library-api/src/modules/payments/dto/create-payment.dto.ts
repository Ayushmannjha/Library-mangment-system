import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentMethod {
  CASH = 'CASH',
  UPI = 'UPI',
  CARD = 'CARD',
  ONLINE = 'ONLINE',
}

export class CreatePaymentDto {
  @ApiProperty({ example: '1' })
  @IsString()
  @IsNotEmpty()
  invoice_id!: string;

  @ApiProperty({ example: 1000.0 })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  amount!: number;

  @ApiProperty({ enum: PaymentMethod, example: 'CASH' })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  payment_method!: PaymentMethod;

  @ApiPropertyOptional({ example: 'TXN123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  transaction_reference?: string;

  @ApiPropertyOptional({ example: 'Paid in full' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'INR', default: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string;
}
