import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';

@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Liveness: process is alive. Never touches dependencies. */
  @Get()
  check() {
    return { status: 'ok', service: 'newshub-api' };
  }

  /** Readiness: dependencies (PostgreSQL) are reachable. */
  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('Database unreachable.');
    }
    return { status: 'ready', service: 'newshub-api' };
  }
}
