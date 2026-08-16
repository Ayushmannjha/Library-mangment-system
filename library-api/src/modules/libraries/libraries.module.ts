import { Module } from '@nestjs/common';
import { LibrariesController } from './libraries.controller';
import { LibrariesService } from './libraries.service';

/**
 * Libraries feature module. PrismaService is NOT imported here because
 * DatabaseModule is @Global and exports it app-wide (see app.module.ts).
 */
@Module({
  controllers: [LibrariesController],
  providers: [LibrariesService],
})
export class LibrariesModule {}
