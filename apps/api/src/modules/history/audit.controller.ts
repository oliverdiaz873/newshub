import { Controller, Get, Inject, Param, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { CurrentUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { DtoPipe } from '../../common/http/validation';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import type { AccessClaims } from '../auth/tokens';

export class AuditQueryDto extends ListQueryDto {
  @IsOptional()
  @IsUUID()
  actorId?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}

/**
 * Immutable audit trail reads. No POST/PATCH/DELETE surface exists by
 * design; rows are written only by service emitters inside the mutating
 * transactions.
 */
@Controller('audit-log')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'editor', 'reviewer')
export class AuditController {
  constructor(@Inject(AuditService) private readonly audit: AuditService) {}

  @Get()
  list(
    @Query(new DtoPipe(AuditQueryDto)) query: AuditQueryDto,
    @CurrentUser() user: AccessClaims,
  ) {
    return this.audit.list(query, { sub: user.sub, role: user.role });
  }

  @Get(':entityType/:entityId')
  trail(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query(new DtoPipe(AuditQueryDto)) query: AuditQueryDto,
    @CurrentUser() user: AccessClaims,
  ) {
    return this.audit.trail(entityType, entityId, query, { sub: user.sub, role: user.role });
  }
}
