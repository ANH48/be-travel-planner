import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { SettlementsService } from './settlements.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('trips/:tripId/settlements')
@UseGuards(JwtAuthGuard)
export class SettlementsController {
  constructor(private settlementsService: SettlementsService) {}

  /**
   * Get all settlements for a trip
   * GET /trips/:tripId/settlements
   */
  @Get()
  getSettlements(@Param('tripId') tripId: string) {
    return this.settlementsService.getSettlements(tripId);
  }

  /**
   * Get settlement detail for a specific member
   * GET /trips/:tripId/settlements/:memberId
   */
  @Get(':memberId')
  getSettlementDetail(
    @Param('tripId') tripId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.settlementsService.getSettlementDetail(tripId, memberId);
  }

  /**
   * Trigger recalculation of settlements
   * POST /trips/:tripId/settlements/recalculate
   */
  @Post('recalculate')
  async recalculateSettlements(@Param('tripId') tripId: string) {
    await this.settlementsService.recalculateSettlements(tripId);
    return {
      success: true,
      message: 'Settlements recalculated successfully',
    };
  }
}
