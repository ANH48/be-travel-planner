import { Trip, TripMember } from '@prisma/client';

export interface TripWithMembers extends Trip {
  members: TripMember[];
}

export interface AccessResult {
  canAccess: boolean;
  role: 'creator' | 'member' | null;
}

/**
 * Check if user can access a trip (either as creator or member)
 */
export function canAccessTrip(
  userId: string,
  userEmail: string,
  trip: TripWithMembers,
): AccessResult {
  // Check if user is creator
  if (trip.ownerId === userId) {
    return { canAccess: true, role: 'creator' };
  }

  // Check if user is member (by email match, case-insensitive)
  const isMember = trip.members.some(
    (m) => m.email?.toLowerCase() === userEmail.toLowerCase(),
  );

  if (isMember) {
    return { canAccess: true, role: 'member' };
  }

  return { canAccess: false, role: null };
}

/**
 * Check if user can modify trip details (only creator)
 */
export function canModifyTrip(userId: string, trip: Trip): boolean {
  return trip.ownerId === userId;
}

/**
 * Check if user can modify expense
 * - Creator can modify any expense
 * - Member can only modify their own expenses
 */
export function canModifyExpense(
  userId: string,
  userEmail: string,
  trip: TripWithMembers,
  expenseCreatorId?: string | null,
): boolean {
  // Trip creator can modify any expense
  if (trip.ownerId === userId) {
    return true;
  }

  // If expense has no creator, deny
  if (!expenseCreatorId) {
    return false;
  }

  // Find current user's member record
  const userMember = trip.members.find(
    (m) => m.email?.toLowerCase() === userEmail.toLowerCase(),
  );

  if (!userMember) {
    return false;
  }

  // Member can only modify their own expenses
  return userMember.id === expenseCreatorId;
}

/**
 * Check if user can modify itinerary item
 * - Creator can modify any itinerary
 * - Member can only modify their own itinerary items
 */
export function canModifyItinerary(
  userId: string,
  userEmail: string,
  trip: TripWithMembers,
  itineraryCreatorId?: string | null,
): boolean {
  // Trip creator can modify any itinerary
  if (trip.ownerId === userId) {
    return true;
  }

  // If itinerary has no creator, deny
  if (!itineraryCreatorId) {
    return false;
  }

  // Find current user's member record
  const userMember = trip.members.find(
    (m) => m.email?.toLowerCase() === userEmail.toLowerCase(),
  );

  if (!userMember) {
    return false;
  }

  // Member can only modify their own itinerary items
  return userMember.id === itineraryCreatorId;
}

/**
 * Get user's member ID in a trip (by email)
 */
export function getUserMemberId(
  userEmail: string,
  members: TripMember[],
): string | null {
  const member = members.find(
    (m) => m.email?.toLowerCase() === userEmail.toLowerCase(),
  );
  return member?.id || null;
}
