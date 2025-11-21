import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { MembersService } from './members.service';
import { CreateMemberDto, UpdateMemberDto } from './dto/member.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUserFull,
  CurrentUserData,
} from '../auth/decorators/current-user-full.decorator';

@Controller('trips/:tripId/members')
@UseGuards(JwtAuthGuard)
export class MembersController {
  constructor(private membersService: MembersService) {}

  /**
   * Invite a member (new invitation system)
   */
  @Post('invite')
  inviteMember(
    @Param('tripId') tripId: string,
    @CurrentUserFull() user: CurrentUserData,
    @Body() dto: InviteMemberDto,
  ) {
    return this.membersService.inviteMember(tripId, user.userId, user.email, dto);
  }

  /**
   * Get pending invitations for this trip
   */
  @Get('invitations')
  getPendingInvitations(
    @Param('tripId') tripId: string,
    @CurrentUserFull() user: CurrentUserData,
  ) {
    return this.membersService.getPendingInvitations(tripId, user.userId);
  }

  /**
   * Legacy: Create member directly (for backward compatibility)
   */
  @Post()
  create(
    @Param('tripId') tripId: string,
    @CurrentUserFull() user: CurrentUserData,
    @Body() dto: CreateMemberDto,
  ) {
    return this.membersService.create(tripId, user.userId, user.email, dto);
  }

  @Get()
  findAll(@Param('tripId') tripId: string) {
    return this.membersService.findAll(tripId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.membersService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @CurrentUserFull() user: CurrentUserData,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.membersService.update(id, user.userId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUserFull() user: CurrentUserData) {
    return this.membersService.remove(id, user.userId);
  }
}

/**
 * Controller for invitation-related actions (accept/reject)
 */
@Controller('invitations')
@UseGuards(JwtAuthGuard)
export class InvitationsController {
  constructor(private membersService: MembersService) {}

  /**
   * Get current user's pending invitations
   */
  @Get('my')
  getMyInvitations(@CurrentUserFull() user: CurrentUserData) {
    return this.membersService.getMyInvitations(user.email);
  }

  /**
   * Accept an invitation
   */
  @Post(':id/accept')
  acceptInvitation(
    @Param('id') id: string,
    @CurrentUserFull() user: CurrentUserData,
  ) {
    return this.membersService.acceptInvitation(id, user.userId, user.email);
  }

  /**
   * Reject an invitation
   */
  @Post(':id/reject')
  rejectInvitation(
    @Param('id') id: string,
    @CurrentUserFull() user: CurrentUserData,
  ) {
    return this.membersService.rejectInvitation(id, user.userId, user.email);
  }

  /**
   * Cancel an invitation (for trip creator)
   */
  @Delete(':id')
  cancelInvitation(
    @Param('id') id: string,
    @CurrentUserFull() user: CurrentUserData,
  ) {
    return this.membersService.cancelInvitation(id, user.userId);
  }
}
