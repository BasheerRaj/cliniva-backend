import { IsString, IsNotEmpty, IsEmail, MinLength, MaxLength, IsOptional, IsEnum } from 'class-validator';

export class RegisterPatientUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  dateOfBirth?: string;

  @IsEnum(['male', 'female', 'other'])
  @IsNotEmpty()
  gender: string;
}

export class LoginPatientDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ResetPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
