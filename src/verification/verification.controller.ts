import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { VerificationService } from './verification.service';
import {
  SendVerificationDto,
  VerifyCodeDto,
  ResendVerificationDto,
} from './dto/verification.dto';

@Controller('auth')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post('send-verification')
  @HttpCode(HttpStatus.OK)
  async sendVerification(@Body() dto: SendVerificationDto) {
    return this.verificationService.sendVerificationCode(dto.email);
  }

  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  async verifyCode(@Body() dto: VerifyCodeDto) {
    const valid = await this.verificationService.verifyCode(dto.email, dto.code);
    return {
      valid,
      message: 'Email verified successfully',
    };
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.verificationService.resendVerificationCode(dto.email);
  }
}
