import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { FirebaseService } from '../firebase/firebase.service';
import { VerificationService } from '../verification/verification.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private firebaseService: FirebaseService,
    private verificationService: VerificationService,
    private emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    // Verify the email verification code
    const isVerified = await this.verificationService.isEmailVerified(dto.email);
    
    if (!isVerified) {
      // Verify the code provided in registration
      await this.verificationService.verifyCode(dto.email, dto.code);
    }

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new UnauthorizedException('Email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user with email verified
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        emailVerified: true,
        verifiedAt: new Date(),
      },
    });

    // Send welcome email (non-blocking)
    this.emailService.sendWelcomeEmail(user.email, user.name).catch((err) => {
      console.error('Failed to send welcome email:', err);
    });

    // Generate token
    const token = this.generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      token,
    };
  }

  async login(dto: LoginDto) {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate token
    const token = this.generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
      },
      token,
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async saveFcmToken(userId: string, token: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken: token },
    });

    console.log(`✅ FCM token saved for user ${userId}`);
    return { success: true, message: 'FCM token saved successfully' };
  }

  async getFirebaseToken(userId: string) {
    try {
      console.log(`🔑 Generating Firebase custom token for user: ${userId}`);
      const customToken = await this.firebaseService.createCustomToken(userId);
      console.log(`✅ Firebase custom token generated successfully`);
      return { token: customToken };
    } catch (error) {
      console.error('❌ Error generating Firebase token:', error);
      throw error;
    }
  }

  private generateToken(userId: string, email: string): string {
    return this.jwtService.sign({
      sub: userId,
      email,
    });
  }
}
