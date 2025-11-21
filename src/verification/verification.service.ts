import {
  Injectable,
  BadRequestException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);
  private readonly OTP_EXPIRY_MINUTES = 5;
  private readonly MAX_ATTEMPTS = 5;
  private readonly RATE_LIMIT_HOURS = 1;
  private readonly MAX_EMAILS_PER_HOUR = 3;

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  private generateOTP(): string {
    // Generate cryptographically secure 6-digit code
    return crypto.randomInt(100000, 999999).toString();
  }

  async sendVerificationCode(email: string): Promise<{ message: string; expiresIn: number }> {
    // Check if email is already registered
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('This email is already registered');
    }

    // Check rate limiting (max 3 emails per hour)
    const oneHourAgo = new Date(Date.now() - this.RATE_LIMIT_HOURS * 60 * 60 * 1000);
    const recentCodes = await this.prisma.emailVerification.count({
      where: {
        email,
        createdAt: {
          gte: oneHourAgo,
        },
      },
    });

    if (recentCodes >= this.MAX_EMAILS_PER_HOUR) {
      throw new BadRequestException(
        'Too many verification requests. Please try again later.',
      );
    }

    // Delete any existing codes for this email
    await this.prisma.emailVerification.deleteMany({
      where: { email },
    });

    // Generate new code
    const code = this.generateOTP();
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

    // Save to database
    await this.prisma.emailVerification.create({
      data: {
        email,
        code,
        expiresAt,
      },
    });

    // Send email
    await this.emailService.sendVerificationEmail(email, code);

    this.logger.log(`Verification code sent to ${email}`);

    return {
      message: 'Verification code sent successfully',
      expiresIn: this.OTP_EXPIRY_MINUTES * 60, // Return in seconds
    };
  }

  async verifyCode(email: string, code: string): Promise<boolean> {
    const verification = await this.prisma.emailVerification.findFirst({
      where: {
        email,
        code,
      },
    });

    if (!verification) {
      throw new BadRequestException('Invalid verification code');
    }

    if (verification.verified) {
      throw new BadRequestException('This code has already been used');
    }

    if (new Date() > verification.expiresAt) {
      throw new BadRequestException('Verification code has expired');
    }

    // Mark as verified
    await this.prisma.emailVerification.update({
      where: { id: verification.id },
      data: { verified: true },
    });

    this.logger.log(`Email verified successfully: ${email}`);

    return true;
  }

  async resendVerificationCode(email: string): Promise<{ message: string; expiresIn: number }> {
    // Check if there's a recent code (within last 60 seconds)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentCode = await this.prisma.emailVerification.findFirst({
      where: {
        email,
        createdAt: {
          gte: oneMinuteAgo,
        },
      },
    });

    if (recentCode) {
      throw new BadRequestException(
        'Please wait 60 seconds before requesting a new code',
      );
    }

    return this.sendVerificationCode(email);
  }

  async isEmailVerified(email: string): Promise<boolean> {
    const verification = await this.prisma.emailVerification.findFirst({
      where: {
        email,
        verified: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return !!verification;
  }

  // Cleanup expired codes - runs every hour
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredCodes() {
    const result = await this.prisma.emailVerification.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired verification codes`);
    }
  }

  // Clean up old verified codes - runs daily
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldVerifiedCodes() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await this.prisma.emailVerification.deleteMany({
      where: {
        verified: true,
        createdAt: {
          lt: oneDayAgo,
        },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} old verified codes`);
    }
  }
}
