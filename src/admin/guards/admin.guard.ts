import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    // Get token from cookie or Authorization header
    const token = this.extractToken(request);
    
    if (!token) {
      throw new ForbiddenException('Authentication required');
    }

    try {
      const payload = this.jwtService.verify(token);
      const userId = payload.sub;
      
      // Check if user is admin
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (!user || user.role !== 'ADMIN') {
        throw new ForbiddenException('Admin access required');
      }

      request.user = userId;
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new ForbiddenException('Invalid token');
    }
  }

  private extractToken(request: any): string | null {
    // Check Authorization header
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // Check cookie
    const cookie = request.cookies?.token;
    if (cookie) {
      return cookie;
    }
    
    return null;
  }
}
