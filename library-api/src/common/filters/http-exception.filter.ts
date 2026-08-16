import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Central error handling. Every thrown error flows through here and is turned
 * into the same { success: false, message, errorCode } shape, so the frontend
 * never has to parse raw framework/Prisma errors and internal details
 * (stack traces, SQL, credentials) are never leaked to clients.
 */

// Maps an HTTP status to a stable, machine-readable error code so clients
// can switch on the code instead of fragile message strings.
function errorCodeForStatus(status: number): string {
  const codes: Record<number, string> = {
    [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
    [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
    [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
    [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
    [HttpStatus.CONFLICT]: 'CONFLICT',
    [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
  };
  return codes[status] ?? 'INTERNAL_SERVER_ERROR';
}

/**
 * Translates expected Prisma error codes into meaningful API errors.
 * Prisma errors carry a `code` like "P2002"; returning them raw would leak
 * database internals and meaningless messages to clients.
 * Returns null when the exception is not a Prisma error.
 */
function mapPrismaError(
  exception: unknown,
): { status: number; message: string; errorCode: string } | null {
  const code = (exception as { code?: string })?.code;
  if (typeof code !== 'string' || !code.startsWith('P')) {
    return null;
  }
  switch (code) {
    case 'P2002':
      // Unique constraint violation (e.g. duplicate library code) -> 409.
      return {
        status: HttpStatus.CONFLICT,
        message: 'A record with this value already exists.',
        errorCode: 'UNIQUE_CONSTRAINT_VIOLATION',
      };
    case 'P2025':
      // "Record not found" on update/delete where the row does not exist.
      return {
        status: HttpStatus.NOT_FOUND,
        message: 'Record not found.',
        errorCode: 'NOT_FOUND',
      };
    case 'P1000':
    case 'P1001':
    case 'P1009':
    case 'P1017':
      // Connection-level failures — the DB is unreachable, this is temporary.
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Database is unavailable. Please try again shortly.',
        errorCode: 'DATABASE_UNAVAILABLE',
      };
    default:
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Database operation failed.',
        errorCode: 'DATABASE_ERROR',
      };
  }
}

// Catches EVERYTHING (the @Catch() with no args), including non-HTTP errors.
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // 1) Prisma / database errors first — they are not HttpExceptions.
    const prismaError = mapPrismaError(exception);
    if (prismaError) {
      response.status(prismaError.status).json({
        success: false,
        message: prismaError.message,
        errorCode: prismaError.errorCode,
      });
      return;
    }

    // 2) Regular NestJS HttpException (BadRequest, NotFound, etc.).
    //    ValidationPipe errors arrive here with a nested `message` array.
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      let message = 'Request failed';
      let errorCode = errorCodeForStatus(status);

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const body = exceptionResponse as Record<string, unknown>;
        // class-validator puts an array of messages here; turn it into one
        // readable sentence for the client.
        if (typeof body.message === 'string') {
          message = body.message;
        } else if (Array.isArray(body.message)) {
          message = body.message.join(', ');
        }
        if (typeof body.errorCode === 'string') {
          errorCode = body.errorCode;
        }
      }

      response.status(status).json({
        success: false,
        message,
        errorCode,
      });
      return;
    }

    // 3) Anything else — never leak internals, give a generic 500.
    //    Real details stay in server logs, not in the client response.
    console.error('Unhandled Exception:', exception);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal server error',
      errorCode: 'INTERNAL_SERVER_ERROR',
    });
  }
}
