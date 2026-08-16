import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * Request body for POST /api/v1/auth/login.
 * A user logs in with email + password. Passwords are Argon2id-hashed in the
 * DB, so we never compare raw strings — argon2.verify is used in AuthService.
 */
export class LoginDto {
  @ApiProperty({ description: 'Registered user email' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ description: 'User password' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
