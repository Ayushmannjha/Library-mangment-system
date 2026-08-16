import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class CreateSeatBookingDto {
  @ApiProperty({ example: '1' })
  @IsString()
  @IsNotEmpty()
  student_id!: string;

  @ApiProperty({ example: '1' })
  @IsString()
  @IsNotEmpty()
  seat_id!: string;

  @ApiProperty({ example: '1' })
  @IsString()
  @IsNotEmpty()
  time_slot_id!: string;

  @ApiProperty({ example: '2026-08-10', description: 'YYYY-MM-DD' })
  @IsDateString()
  @IsNotEmpty()
  booking_date!: string;
}
