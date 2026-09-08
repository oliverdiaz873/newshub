import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Response } from 'express';

/**
 * Cache policy (API Contract v1.1 + P0-3 fixes).
 *
 * Public GETs stay CDN-friendly with a BOUNDED 60s staleness:
 * `public, s-maxage=60`. Deliberately NO stale-while-revalidate: serving
 * minutes-old editorial content (e.g. just-unpublished articles) breaks
 * the publishing workflow and makes E2E non-deterministic.
 * Authenticated GETs must NEVER be shared-cached (per-user data) and must
 * never serve stale management UI from the browser cache: `no-store`.
 * (Without this, the dashboard reads back pre-mutation lists for up to 60s
 * while writes succeed server-side.)
 */
@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<{ method: string; headers: Record<string, string | undefined> }>();
    return next.handle().pipe(
      tap(() => {
        // File downloads and manual @Res() handlers may have sent headers already.
        if (res.headersSent) return;
        if (req.method !== 'GET' || res.getHeader('Cache-Control')) return;
        if (req.headers.authorization) {
          res.setHeader('Cache-Control', 'no-store, max-age=0');
          return;
        }
        res.setHeader('Cache-Control', 'public, s-maxage=60');
      }),
    );
  }
}
