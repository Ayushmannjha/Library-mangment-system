import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSeatDto {
  @ApiProperty({ example: 'S-1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  seat_number!: string;

  @ApiPropertyOptional({ example: 'Corner Seat' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'Quiet zone by the window' })
  @IsOptional()
  @IsString()
  description?: string;

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
