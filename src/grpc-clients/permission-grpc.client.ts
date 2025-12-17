import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';

interface PermissionServiceClient {
  checkTripAccess(data: any): Observable<any>;
  checkTripModify(data: any): Observable<any>;
  checkExpenseModify(data: any): Observable<any>;
  checkItineraryModify(data: any): Observable<any>;
  getUserMemberId(data: any): Observable<any>;
}

@Injectable()
export class PermissionGrpcClient implements OnModuleInit {
  private permissionService: PermissionServiceClient;

  constructor(@Inject('PERMISSION_PACKAGE') private client: ClientGrpc) {}

  onModuleInit() {
    this.permissionService = this.client.getService<PermissionServiceClient>('PermissionService');
  }

  async checkTripAccess(userId: string, userEmail: string, tripId: string) {
    return firstValueFrom(
      this.permissionService.checkTripAccess({
        user_id: userId,
        user_email: userEmail,
        trip_id: tripId,
      }),
    );
  }

  async checkTripModify(userId: string, tripId: string) {
    return firstValueFrom(
      this.permissionService.checkTripModify({
        user_id: userId,
        trip_id: tripId,
      }),
    );
  }

  async checkExpenseModify(
    userId: string,
    userEmail: string,
    tripId: string,
    expenseCreatorId?: string,
  ) {
    return firstValueFrom(
      this.permissionService.checkExpenseModify({
        user_id: userId,
        user_email: userEmail,
        trip_id: tripId,
        expense_creator_id: expenseCreatorId || '',
      }),
    );
  }

  async checkItineraryModify(
    userId: string,
    userEmail: string,
    tripId: string,
    itineraryCreatorId?: string,
  ) {
    return firstValueFrom(
      this.permissionService.checkItineraryModify({
        user_id: userId,
        user_email: userEmail,
        trip_id: tripId,
        itinerary_creator_id: itineraryCreatorId || '',
      }),
    );
  }

  async getUserMemberId(userEmail: string, tripId: string) {
    return firstValueFrom(
      this.permissionService.getUserMemberId({
        user_email: userEmail,
        trip_id: tripId,
      }),
    );
  }
}
