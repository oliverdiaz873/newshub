import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

function contextWith(user: { role: string } | undefined): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function guardWith(roles: string[] | undefined): RolesGuard {
  return new RolesGuard({ getAllAndOverride: () => roles } as unknown as Reflector);
}

describe('RolesGuard', () => {
  it('passes routes without metadata', () => {
    expect(guardWith(undefined).canActivate(contextWith({ role: 'editor' }))).toBe(true);
  });

  it('allows listed roles and forbids others with 403', () => {
    expect(guardWith(['admin', 'editor']).canActivate(contextWith({ role: 'editor' }))).toBe(true);
    expect(() => guardWith(['admin']).canActivate(contextWith({ role: 'reader' }))).toThrow(
      expect.objectContaining({ status: 403 }),
    );
    expect(() => guardWith(['admin']).canActivate(contextWith(undefined))).toThrow(
      expect.objectContaining({ status: 403 }),
    );
  });
});
