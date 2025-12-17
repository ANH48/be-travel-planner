import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'permissions',
        protoPath: join(__dirname, '../../../libs/proto/permissions.proto'),
        url: '0.0.0.0:50052',
      },
    },
  );

  await app.listen();
  console.log('🔐 Permission Service is running on port 50052 (gRPC)');
}
bootstrap();
