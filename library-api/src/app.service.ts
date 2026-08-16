import { Injectable } from '@nestjs/common';

/**
 * Scaffold service for the default / endpoint. Left as-is for the NestJS
 * smoke test; real business logic lives in feature modules.
 */
@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
