import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { AccessClaims } from './tokens';

export const ROLES_KEY = 'roles';

/** Restricts the route to the given roles (checked by RolesGuard). */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AccessClaims => {
    const req = ctx.switchToHttp().getRequest<{ user: AccessClaims }>();
    return req.user;
  },
);
