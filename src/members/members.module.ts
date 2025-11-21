import { Module, forwardRef } from '@nestjs/common';
import { MembersService } from './members.service';
import { MembersController, InvitationsController } from './members.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, forwardRef(() => NotificationsModule)],
  controllers: [MembersController, InvitationsController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
