import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class AssignRolesDto {
  @ApiProperty({ example: ['STAFF', 'LIBRARIAN'] })
  @IsArray()
  @IsString({ each: true })
  roleCodes!: string[];
}
