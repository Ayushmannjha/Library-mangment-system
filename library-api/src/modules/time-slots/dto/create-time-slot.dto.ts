import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateTimeSlotDto {
  @ApiProperty({ example: 'Morning Shift' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    example: '08:00:00',
    description: 'Start time in HH:mm:ss format',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: 'start_time must be in HH:mm:ss format',
  })
  start_time!: string;

  @ApiProperty({
    example: '14:00:00',
    description: 'End time in HH:mm:ss format',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: 'end_time must be in HH:mm:ss format',
  })
  end_time!: string;

  @ApiPropertyOptional({ example: 'Morning study shift' })
  @IsOptional()
  @IsString()
  description?: string;
}
