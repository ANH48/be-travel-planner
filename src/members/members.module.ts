import { Module, forwardRef } from '@nestjs/common';
import { MembersService } from './members.service';
import { MembersController, InvitationsController } from './members.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GrpcClientsModule } from '../grpc-clients/grpc-clients.module';

@Module({
  imports: [PrismaModule, forwardRef(() => NotificationsModule), GrpcClientsModule],
  controllers: [MembersController, InvitationsController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
