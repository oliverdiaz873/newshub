import { ArgumentsHost, ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { ProblemExceptionFilter } from '../common/http/problem.filter';

function host() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status };
  const req = { method: 'GET', path: '/api/v1/health/ready' };
  return {
    res,
    req,
    json,
    status,
    host: {
      switchToHttp: () => ({ getResponse: () => res, getRequest: () => req }),
    } as unknown as ArgumentsHost,
  };
}

describe('health controller (M3)', () => {
  it('reports ready when the database answers', async () => {
    const prisma = { $queryRawUnsafe: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    const controller = new HealthController(prisma as never);
    await expect(controller.ready()).resolves.toEqual({ status: 'ready', service: 'newshub-api' });
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith('SELECT 1');
  });

  it('fails specifically with 503 (never 500) when the database is down', async () => {
    const prisma = { $queryRawUnsafe: jest.fn().mockRejectedValue(new Error('connect')) };
    const controller = new HealthController(prisma as never);
    let err: unknown;
    await controller.ready().catch((e: unknown) => {
      err = e;
    });
    expect(err).toBeInstanceOf(ServiceUnavailableException);
    expect((err as ServiceUnavailableException).getStatus()).toBe(503);
    expect((err as ServiceUnavailableException).getStatus()).not.toBe(500);
  });

  it('maps the 503 to Problem JSON with code service_unavailable', () => {
    const { host: h, json, status } = host();
    new ProblemExceptionFilter().catch(new ServiceUnavailableException('Database unreachable.'), h);
    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 503, code: 'service_unavailable' }),
    );
  });
});
