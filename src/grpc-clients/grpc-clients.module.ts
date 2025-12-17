import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { AuthGrpcClient } from './auth-grpc.client';
import { PermissionGrpcClient } from './permission-grpc.client';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'AUTH_PACKAGE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'auth',
            protoPath: join(__dirname, '../../libs/proto/auth.proto'),
            url: config.get('AUTH_SERVICE_URL') || 'localhost:50051',
          },
        }),
      },
      {
        name: 'PERMISSION_PACKAGE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'permissions',
            protoPath: join(__dirname, '../../libs/proto/permissions.proto'),
            url: config.get('PERMISSION_SERVICE_URL') || 'localhost:50052',
          },
        }),
      },
    ]),
  ],
  providers: [AuthGrpcClient, PermissionGrpcClient],
  exports: [AuthGrpcClient, PermissionGrpcClient],
})
export class GrpcClientsModule {}
