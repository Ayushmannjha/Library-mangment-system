import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class BulkCreateSeatsDto {
  @ApiProperty({
    example: 'S-',
    description: 'Prefix for the generated seat numbers',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  prefix!: string;

  @ApiProperty({ example: 1, description: 'Starting number for generation' })
  @IsInt()
  @Min(1)
  start_number!: number;

  @ApiProperty({
    example: 50,
    description: 'Total number of seats to generate',
  })
  @IsInt()
  @Min(1)
  @Max(1000)
  count!: number;

  @ApiPropertyOptional({ example: 'Ground Floor' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  floor?: string;

  @ApiPropertyOptional({ example: 'A' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  section?: string;
}
