import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';

interface AuthServiceClient {
  validateToken(data: any): Observable<any>;
  getMe(data: any): Observable<any>;
}

@Injectable()
export class AuthGrpcClient implements OnModuleInit {
  private authService: AuthServiceClient;

  constructor(@Inject('AUTH_PACKAGE') private client: ClientGrpc) {}

  onModuleInit() {
    this.authService = this.client.getService<AuthServiceClient>('AuthService');
  }

  async validateToken(token: string) {
    return firstValueFrom(
      this.authService.validateToken({ token }),
    );
  }

  async getMe(userId: string) {
    return firstValueFrom(
      this.authService.getMe({ user_id: userId }),
    );
  }
}
