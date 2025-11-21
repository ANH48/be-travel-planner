import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMemberDto, UpdateMemberDto } from './dto/member.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { canModifyTrip } from '../common/helpers/trip-access.helper';
import { NotificationsService } from '../notifications/notifications.service';
import { FirebaseService } from '../firebase/firebase.service';
import { NotificationType, InvitationStatus } from '@prisma/client';

@Injectable()
export class MembersService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
    private firebaseService: FirebaseService,
  ) {}

  /**
   * Invite a member to the trip (creates invitation, not member)
   */
  async inviteMember(
    tripId: string,
    userId: string,
    userEmail: string,
    dto: InviteMemberDto,
  ) {
    // Verify trip exists and user is the creator
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { 
        members: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (!canModifyTrip(userId, trip)) {
      throw new ForbiddenException(
        'Only the trip creator can invite members',
      );
    }

    // Check if user is trying to invite themselves
    if (dto.email.toLowerCase() === userEmail.toLowerCase()) {
      throw new BadRequestException('You cannot invite yourself');
    }

    // Check if email is already a member
    const existingMember = trip.members.find(
      (m) => m.email?.toLowerCase() === dto.email.toLowerCase(),
    );
    if (existingMember) {
      throw new BadRequestException('This user is already a member of the trip');
    }

    // Check if there's already a pending invitation
    const existingInvitation = await this.prisma.memberInvitation.findUnique({
      where: {
        tripId_invitedEmail: {
          tripId,
          invitedEmail: dto.email.toLowerCase(),
        },
      },
    });

    if (existingInvitation) {
      if (existingInvitation.status === 'PENDING') {
        throw new BadRequestException('An invitation has already been sent to this email');
      }
      if (existingInvitation.status === 'ACCEPTED') {
        throw new BadRequestException('This user has already accepted the invitation');
      }
      // If rejected, we can create a new invitation
      await this.prisma.memberInvitation.delete({
        where: { id: existingInvitation.id },
      });
    }

    // Check if invited user exists in the system
    const invitedUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        fcmToken: true,
      },
    });

    // Create invitation
    const invitation = await this.prisma.memberInvitation.create({
      data: {
        tripId,
        inviterId: userId,
        invitedEmail: dto.email.toLowerCase(),
        invitedUserId: invitedUser?.id,
        status: 'PENDING',
      },
      include: {
        trip: true,
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // If invited user exists, create notification
    if (invitedUser) {
      await this.notificationsService.createNotification(
        invitedUser.id,
        'TRIP_INVITATION',
        `Trip Invitation: ${trip.name}`,
        `${trip.owner.name} invited you to join "${trip.name}" (${trip.location})`,
        {
          tripId: trip.id,
          tripName: trip.name,
          tripLocation: trip.location,
          invitationId: invitation.id,
          inviterName: trip.owner.name,
        },
      );

      // Send Firebase push notification if user has FCM token
      if (invitedUser.fcmToken) {
        try {
          await this.firebaseService.sendNotification(invitedUser.fcmToken, {
            title: 'Trip Invitation',
            body: `${trip.owner.name} invited you to join "${trip.name}"`,
            data: {
              type: 'TRIP_INVITATION',
              tripId: trip.id,
              tripName: trip.name,
              invitationId: invitation.id,
              inviterName: trip.owner.name,
            },
          });
          console.log(`✅ Firebase notification sent to ${invitedUser.email}`);
        } catch (error) {
          console.error('Failed to send Firebase notification:', error);
          // Don't fail the whole request if notification fails
        }
      } else {
        console.log(`⚠️ No FCM token for user ${invitedUser.email}, notification not sent`);
      }
    }

    return {
      ...invitation,
      message: invitedUser
        ? 'Invitation sent successfully'
        : 'Invitation created. User will be notified when they register with this email.',
    };
  }

  /**
   * Accept an invitation
   */
  async acceptInvitation(invitationId: string, userId: string, userEmail: string) {
    const invitation = await this.prisma.memberInvitation.findUnique({
      where: { id: invitationId },
      include: {
        trip: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                fcmToken: true,
              },
            },
          },
        },
        inviter: {
          select: {
            id: true,
            name: true,
            fcmToken: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // Verify the invitation is for this user
    if (invitation.invitedEmail.toLowerCase() !== userEmail.toLowerCase()) {
      throw new ForbiddenException('This invitation is not for you');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException(`Invitation has already been ${invitation.status.toLowerCase()}`);
    }

    // Get current user info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create member and update invitation in a transaction
    const [member, updatedInvitation] = await this.prisma.$transaction([
      this.prisma.tripMember.create({
        data: {
          tripId: invitation.tripId,
          userId: user.id,
          name: user.name,
          email: user.email,
        },
      }),
      this.prisma.memberInvitation.update({
        where: { id: invitationId },
        data: { status: 'ACCEPTED' },
      }),
    ]);

    // Notify trip owner that member joined
    await this.notificationsService.createNotification(
      invitation.inviter.id,
      'MEMBER_JOINED',
      `${user.name} accepted invitation`,
      `${user.name} accepted your invitation to "${invitation.trip.name}"`,
      {
        tripId: invitation.tripId,
        tripName: invitation.trip.name,
        memberName: user.name,
        memberId: user.id,
      },
    );

    // Send Firebase push notification to trip creator
    if (invitation.inviter.fcmToken) {
      try {
        await this.firebaseService.sendNotification(invitation.inviter.fcmToken, {
          title: '✅ Invitation Accepted',
          body: `${user.name} accepted your invitation to "${invitation.trip.name}"`,
          data: {
            type: 'MEMBER_JOINED',
            tripId: invitation.tripId,
            tripName: invitation.trip.name,
            memberName: user.name,
            memberId: user.id,
          },
        });
        console.log(`✅ Acceptance notification sent to trip creator`);
      } catch (error) {
        console.error('Failed to send acceptance notification:', error);
      }
    }

    return {
      member,
      message: 'Invitation accepted successfully',
    };
  }

  /**
   * Reject an invitation
   */
  async rejectInvitation(invitationId: string, userId: string, userEmail: string) {
    const invitation = await this.prisma.memberInvitation.findUnique({
      where: { id: invitationId },
      include: {
        trip: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        inviter: {
          select: {
            id: true,
            name: true,
            fcmToken: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // Verify the invitation is for this user
    if (invitation.invitedEmail.toLowerCase() !== userEmail.toLowerCase()) {
      throw new ForbiddenException('This invitation is not for you');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException(`Invitation has already been ${invitation.status.toLowerCase()}`);
    }

    // Get user info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update invitation status
    await this.prisma.memberInvitation.update({
      where: { id: invitationId },
      data: { status: 'REJECTED' },
    });

    // Notify trip creator that invitation was rejected
    await this.notificationsService.createNotification(
      invitation.inviter.id,
      'INVITATION_CANCELLED',
      `${user.name} declined invitation`,
      `${user.name} declined your invitation to "${invitation.trip.name}"`,
      {
        tripId: invitation.trip.id,
        tripName: invitation.trip.name,
        memberName: user.name,
        invitationId: invitation.id,
      },
    );

    // Send Firebase push notification to trip creator
    if (invitation.inviter.fcmToken) {
      try {
        await this.firebaseService.sendNotification(invitation.inviter.fcmToken, {
          title: '❌ Invitation Declined',
          body: `${user.name} declined your invitation to "${invitation.trip.name}"`,
          data: {
            type: 'INVITATION_CANCELLED',
            tripId: invitation.trip.id,
            tripName: invitation.trip.name,
            memberName: user.name,
            invitationId: invitation.id,
          },
        });
        console.log(`✅ Rejection notification sent to trip creator`);
      } catch (error) {
        console.error('Failed to send rejection notification:', error);
      }
    }

    return {
      message: 'Invitation rejected',
    };
  }

  /**
   * Get pending invitations for a trip (for creator to see)
   */
  async getPendingInvitations(tripId: string, userId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (!canModifyTrip(userId, trip)) {
      throw new ForbiddenException('Only trip creator can view invitations');
    }

    return this.prisma.memberInvitation.findMany({
      where: {
        tripId,
        status: 'PENDING',
      },
      include: {
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        invitedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get user's pending invitations
   */
  async getMyInvitations(userEmail: string) {
    return this.prisma.memberInvitation.findMany({
      where: {
        invitedEmail: userEmail.toLowerCase(),
        status: 'PENDING',
      },
      include: {
        trip: {
          select: {
            id: true,
            name: true,
            location: true,
            startDate: true,
            endDate: true,
            description: true,
          },
        },
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Cancel an invitation (for trip creator only)
   */
  async cancelInvitation(invitationId: string, userId: string) {
    const invitation = await this.prisma.memberInvitation.findUnique({
      where: { id: invitationId },
      include: {
        trip: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        invitedUser: {
          select: {
            id: true,
            email: true,
            name: true,
            fcmToken: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // Verify user is the trip creator
    if (!canModifyTrip(userId, invitation.trip)) {
      throw new ForbiddenException('Only trip creator can cancel invitations');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException(`Cannot cancel ${invitation.status.toLowerCase()} invitation`);
    }

    // Delete the invitation
    await this.prisma.memberInvitation.delete({
      where: { id: invitationId },
    });

    // If invited user exists, send cancellation notification
    if (invitation.invitedUser) {
      // Create notification in database
      await this.notificationsService.createNotification(
        invitation.invitedUser.id,
        'INVITATION_CANCELLED',
        'Invitation Cancelled',
        `${invitation.trip.owner.name} cancelled the invitation to "${invitation.trip.name}"`,
        {
          tripId: invitation.tripId,
          tripName: invitation.trip.name,
          invitationId: invitation.id,
        },
      );

      // Send Firebase push notification to remove the invitation
      if (invitation.invitedUser.fcmToken) {
        try {
          await this.firebaseService.sendNotification(invitation.invitedUser.fcmToken, {
            title: 'Invitation Cancelled',
            body: `${invitation.trip.owner.name} cancelled the invitation to "${invitation.trip.name}"`,
            data: {
              type: 'INVITATION_CANCELLED',
              tripId: invitation.tripId,
              tripName: invitation.trip.name,
              invitationId: invitation.id,
            },
          });
          console.log(`✅ Cancellation notification sent to ${invitation.invitedUser.email}`);
        } catch (error) {
          console.error('Failed to send cancellation notification:', error);
        }
      }
    }

    return {
      message: 'Invitation cancelled successfully',
    };
  }

  // Keep old create method for backward compatibility (optional)
  async create(tripId: string, userId: string, userEmail: string, dto: CreateMemberDto) {
    // Verify trip exists and user is the creator
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { members: true },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (!canModifyTrip(userId, trip)) {
      throw new ForbiddenException(
        'Only the trip creator can add members',
      );
    }

    return this.prisma.tripMember.create({
      data: {
        tripId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
      },
    });
  }

  async findAll(tripId: string) {
    return this.prisma.tripMember.findMany({
      where: { tripId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const member = await this.prisma.tripMember.findUnique({
      where: { id },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return member;
  }

  async update(id: string, userId: string, dto: UpdateMemberDto) {
    const member = await this.prisma.tripMember.findUnique({
      where: { id },
      include: { trip: true },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (!canModifyTrip(userId, member.trip)) {
      throw new ForbiddenException(
        'Only the trip creator can update members',
      );
    }

    return this.prisma.tripMember.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
      },
    });
  }

  async remove(id: string, userId: string) {
    const member = await this.prisma.tripMember.findUnique({
      where: { id },
      include: { trip: true },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (!canModifyTrip(userId, member.trip)) {
      throw new ForbiddenException(
        'Only the trip creator can delete members',
      );
    }

    await this.prisma.tripMember.delete({
      where: { id },
    });

    return { message: 'Member deleted successfully' };
  }
}
