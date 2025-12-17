import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { PermissionsService } from './permissions.service';

@Controller()
export class PermissionsController {
  constructor(private permissionsService: PermissionsService) {}

  @GrpcMethod('PermissionService', 'CheckTripAccess')
  async checkTripAccess(data: any) {
    return this.permissionsService.checkTripAccess(
      data.user_id,
      data.user_email,
      data.trip_id,
    );
  }

  @GrpcMethod('PermissionService', 'CheckTripModify')
  async checkTripModify(data: any) {
    const canModify = await this.permissionsService.checkTripModify(
      data.user_id,
      data.trip_id,
    );
    return { can_modify: canModify };
  }

  @GrpcMethod('PermissionService', 'CheckExpenseModify')
  async checkExpenseModify(data: any) {
    const canModify = await this.permissionsService.checkExpenseModify(
      data.user_id,
      data.user_email,
      data.trip_id,
      data.expense_creator_id,
    );
    return { can_modify: canModify };
  }

  @GrpcMethod('PermissionService', 'CheckItineraryModify')
  async checkItineraryModify(data: any) {
    const canModify = await this.permissionsService.checkItineraryModify(
      data.user_id,
      data.user_email,
      data.trip_id,
      data.itinerary_creator_id,
    );
    return { can_modify: canModify };
  }

  @GrpcMethod('PermissionService', 'GetUserMemberId')
  async getUserMemberId(data: any) {
    const memberId = await this.permissionsService.getUserMemberId(
      data.user_email,
      data.trip_id,
    );
    return { member_id: memberId || '' };
  }
}
