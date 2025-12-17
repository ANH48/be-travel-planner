import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisCacheModule } from './cache/redis-cache.module';
import { PermissionsModule } from './permissions/permissions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/permission-svc/.env',
    }),
    PrismaModule,
    RedisCacheModule,
    PermissionsModule,
  ],
})
export class AppModule {}
