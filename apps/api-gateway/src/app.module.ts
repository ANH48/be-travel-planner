import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { join } from 'path';
import { AuthController } from './auth/auth.controller';
import { AuthGrpcClient } from './auth/auth-grpc.client';
import { PermissionGrpcClient } from './auth/permission-grpc.client';
import { JwtStrategy } from './auth/jwt.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/api-gateway/.env',
    }),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') || '7d' },
      }),
    }),
    ClientsModule.register([
      {
        name: 'AUTH_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'auth',
          protoPath: join(__dirname, '../../../libs/proto/auth.proto'),
          url: process.env.AUTH_SERVICE_URL || 'localhost:50051',
        },
      },
      {
        name: 'PERMISSION_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'permissions',
          protoPath: join(__dirname, '../../../libs/proto/permissions.proto'),
          url: process.env.PERMISSION_SERVICE_URL || 'localhost:50052',
        },
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthGrpcClient, PermissionGrpcClient, JwtStrategy],
})
export class AppModule {}
