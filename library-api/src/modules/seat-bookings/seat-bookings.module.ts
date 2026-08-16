import { Module } from '@nestjs/common';
import { SeatBookingsService } from './seat-bookings.service';
import { SeatBookingsController } from './seat-bookings.controller';

@Module({
  controllers: [SeatBookingsController],
  providers: [SeatBookingsService],
  exports: [SeatBookingsService],
})
export class SeatBookingsModule {}
