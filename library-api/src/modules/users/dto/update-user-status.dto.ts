import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({ example: 'INACTIVE', enum: ['ACTIVE', 'INACTIVE'] })
  @IsNotEmpty()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status!: 'ACTIVE' | 'INACTIVE';
}
