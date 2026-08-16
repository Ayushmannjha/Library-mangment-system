import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';

/**
 * Global mail module. Marked @Global so any feature module (e.g. Students)
 * can inject MailService without importing MailModule itself.
 */
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
