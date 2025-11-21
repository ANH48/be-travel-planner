import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() userId: string) {
    return this.authService.getMe(userId);
  }

  @Post('fcm-token')
  @UseGuards(JwtAuthGuard)
  async saveFcmToken(
    @CurrentUser() userId: string,
    @Body('token') token: string,
  ) {
    return this.authService.saveFcmToken(userId, token);
  }

  @Get('firebase-token')
  @UseGuards(JwtAuthGuard)
  async getFirebaseToken(@CurrentUser() userId: string) {
    return this.authService.getFirebaseToken(userId);
  }
}
