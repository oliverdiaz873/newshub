import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Response } from 'express';

/**
 * Public GET cache policy (API Contract v1.1).
 * Editorial/private responses must set no-store at the handler level instead.
 */
@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<{ method: string }>();
    return next.handle().pipe(
      tap(() => {
        // File downloads and manual @Res() handlers may have sent headers already.
        if (res.headersSent) return;
        if (req.method === 'GET' && !res.getHeader('Cache-Control')) {
          res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
        }
      }),
    );
  }
}
