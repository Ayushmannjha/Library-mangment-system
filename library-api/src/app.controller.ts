import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

/**
 * Default NestJS scaffold health/hello endpoint, kept only as a simple
 * smoke-test that the app boots and routes respond.
 */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
