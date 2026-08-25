import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class PayerSignupDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}

export class PayerLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}