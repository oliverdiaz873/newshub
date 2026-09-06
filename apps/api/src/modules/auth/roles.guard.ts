import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './decorators';
import type { AccessClaims } from './tokens';

/**
 * Enforces @Roles(...) against req.user.role. Public routes carry no
 * metadata and pass. In MVP admin and editor share content permissions;
 * admin-only stays reserved for future truly-admin features.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const req = context.switchToHttp().getRequest<{ user?: AccessClaims }>();
    if (!req.user || !required.includes(req.user.role)) {
      throw new ForbiddenException('Insufficient role.');
    }
    return true;
  }
}
