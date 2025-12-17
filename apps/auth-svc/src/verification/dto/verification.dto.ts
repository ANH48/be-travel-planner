import { IsEmail, IsString, Length } from 'class-validator';

export class SendVerificationDto {
  @IsEmail()
  email: string;
}

export class VerifyCodeDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6)
  code: string;
}

export class ResendVerificationDto {
  @IsEmail()
  email: string;
}
