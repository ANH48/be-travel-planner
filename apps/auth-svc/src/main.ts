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
        package: 'auth',
        protoPath: join(__dirname, '../../../libs/proto/auth.proto'),
        url: '0.0.0.0:50051',
      },
    },
  );

  await app.listen();
  console.log('🚀 Auth Service (gRPC) is running on port 50051');
}
bootstrap();
