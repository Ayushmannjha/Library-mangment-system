import { Module } from '@nestjs/common';
import { StudentPortalController } from './student-portal.controller';
import { AttendanceLandingController } from './attendance-landing.controller';
import { StudentPortalService } from './student-portal.service';
import { AttendanceModule } from '../attendance/attendance.module';

@Module({
  imports: [AttendanceModule],
  controllers: [StudentPortalController, AttendanceLandingController],
  providers: [StudentPortalService],
})
export class StudentPortalModule {}
