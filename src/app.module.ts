import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TripsModule } from './trips/trips.module';
import { MembersModule } from './members/members.module';
import { ExpensesModule } from './expenses/expenses.module';
import { SettlementsModule } from './settlements/settlements.module';
import { ItineraryModule } from './itinerary/itinerary.module';
import { AdminModule } from './admin/admin.module';
import { NotificationsModule } from './notifications/notifications.module';
import { FirebaseModule } from './firebase/firebase.module';
import { VerificationModule } from './verification/verification.module';
import { EmailModule } from './email/email.module';
import { GrpcClientsModule } from './grpc-clients/grpc-clients.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    GrpcClientsModule,
    FirebaseModule,
    AuthModule,
    UsersModule,
    TripsModule,
    MembersModule,
    ExpensesModule,
    SettlementsModule,
    ItineraryModule,
    AdminModule,
    NotificationsModule,
    VerificationModule,
    EmailModule,
  ],
})
export class AppModule {}
