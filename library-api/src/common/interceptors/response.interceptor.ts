import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Contract that every API response follows so the frontend can rely on ONE
 * shape instead of special-casing every endpoint.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
  errorCode?: string;
}

/**
 * Recursively converts values that JSON.stringify cannot handle into
 * JSON-safe equivalents:
 *  - bigint  -> string (Prisma BigInt ids would otherwise CRASH res.json)
 *  - Date    -> ISO string (predictable, timezone-aware format)
 * Traverses arrays and nested objects automatically.
 */
function safeJson(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map((item) => safeJson(item));
  }
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      result[key] = safeJson((value as Record<string, unknown>)[key]);
    }
    return result;
  }
  return value;
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((payload: unknown) => {
        // If a controller or filter already returned an envelope-shaped body
        // (e.g. an error object), don't wrap it a second time.
        if (
          payload &&
          typeof payload === 'object' &&
          'success' in (payload as Record<string, unknown>)
        ) {
          return safeJson(payload);
        }

        const body = (payload ?? {}) as Record<string, unknown>;
        const hasData = 'data' in body;

        // Normalize every successful response into { success, message, data }.
        // When payload is an object with `data`/`meta`/`message` keys, keep
        // them; otherwise the raw payload becomes the `data` field.
        return safeJson({
          success: true,
          message: hasData
            ? (body.message ?? 'Request processed successfully')
            : 'Request processed successfully',
          data: hasData ? body.data : payload,
          ...('meta' in body ? { meta: body.meta } : {}),
        });
      }),
    );
  }
}
