import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { verifyAccess, type AccessClaims } from './tokens';

function bearerOf(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

/** Attaches verified access claims as req.user; strict 401 otherwise. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: AccessClaims;
    }>();
    const token = bearerOf(req.headers.authorization);
    if (!token) throw new UnauthorizedException('Missing bearer token.');
    try {
      req.user = verifyAccess(token);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token.');
    }
  }
}
