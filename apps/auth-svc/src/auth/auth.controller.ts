import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(private authService: AuthService) {}

  @GrpcMethod('AuthService', 'Register')
  async register(data: any) {
    return this.authService.register(data);
  }

  @GrpcMethod('AuthService', 'Login')
  async login(data: any) {
    return this.authService.login(data);
  }

  @GrpcMethod('AuthService', 'GetMe')
  async getMe(data: any) {
    const user = await this.authService.getMe(data.user_id);
    return { user };
  }

  @GrpcMethod('AuthService', 'ValidateToken')
  async validateToken(data: any) {
    return this.authService.validateToken(data.token);
  }

  @GrpcMethod('AuthService', 'SaveFcmToken')
  async saveFcmToken(data: any) {
    return this.authService.saveFcmToken(data.user_id, data.token);
  }

  @GrpcMethod('AuthService', 'GetFirebaseToken')
  async getFirebaseToken(data: any) {
    const token = await this.authService.getFirebaseToken(data.user_id);
    return { token };
  }
}
