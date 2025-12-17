import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';

interface AuthServiceClient {
  register(data: any): Observable<any>;
  login(data: any): Observable<any>;
  getMe(data: any): Observable<any>;
  validateToken(data: any): Observable<any>;
  saveFcmToken(data: any): Observable<any>;
  getFirebaseToken(data: any): Observable<any>;
}

@Injectable()
export class AuthGrpcClient implements OnModuleInit {
  private authService: AuthServiceClient;

  constructor(@Inject('AUTH_PACKAGE') private client: ClientGrpc) {}

  onModuleInit() {
    this.authService = this.client.getService<AuthServiceClient>('AuthService');
  }

  async register(data: any) {
    return firstValueFrom(this.authService.register(data));
  }

  async login(data: any) {
    return firstValueFrom(this.authService.login(data));
  }

  async getMe(userId: string) {
    return firstValueFrom(this.authService.getMe({ user_id: userId }));
  }

  async validateToken(token: string) {
    return firstValueFrom(this.authService.validateToken({ token }));
  }

  async saveFcmToken(userId: string, token: string) {
    return firstValueFrom(
      this.authService.saveFcmToken({ user_id: userId, token }),
    );
  }

  async getFirebaseToken(userId: string) {
    return firstValueFrom(
      this.authService.getFirebaseToken({ user_id: userId }),
    );
  }
}
