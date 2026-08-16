import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

/**
 * Single, application-wide Prisma Client.
 *
 * Prisma 7 no longer embeds a Rust query engine by default — a driver
 * adapter is mandatory. PrismaPg wraps the `pg` driver and receives the
 * connection string from the environment (loaded by ConfigModule).
 *
 * Extending PrismaClient lets every service use `this.prisma.<model>`
 * directly with fully typed queries from the generated client.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
      }),
    });
  }

  // Establish the connection pool when the app boots, so the first request
  // does not pay a cold-start connection penalty.
  async onModuleInit() {
    await this.$connect();
  }

  // Always release connections on shutdown to avoid leaked handles.
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
