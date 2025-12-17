import { Module } from '@nestjs/common';
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';
import { GrpcClientsModule } from '../grpc-clients/grpc-clients.module';

@Module({
  imports: [GrpcClientsModule],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
