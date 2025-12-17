import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { AuthGrpcClient } from './auth-grpc.client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authGrpcClient: AuthGrpcClient) {}

  @Post('register')
  async register(@Body() dto: any) {
    return this.authGrpcClient.register(dto);
  }

  @Post('login')
  async login(@Body() dto: any) {
    return this.authGrpcClient.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() userId: string) {
    return this.authGrpcClient.getMe(userId);
  }

  @Post('fcm-token')
  @UseGuards(JwtAuthGuard)
  async saveFcmToken(
    @CurrentUser() userId: string,
    @Body('token') token: string,
  ) {
    return this.authGrpcClient.saveFcmToken(userId, token);
  }

  @Get('firebase-token')
  @UseGuards(JwtAuthGuard)
  async getFirebaseToken(@CurrentUser() userId: string) {
    return this.authGrpcClient.getFirebaseToken(userId);
  }
}
