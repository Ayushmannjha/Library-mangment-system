import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * @Global keeps a SINGLE PrismaService instance shared across the whole app.
 * Multiple independent Prisma clients would each create their own connection
 * pool and waste PostgreSQL connections.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
