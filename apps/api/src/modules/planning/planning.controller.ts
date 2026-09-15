import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PlanningService, type PlanningActor } from './planning.service';
import { AssignPlanningDto, CalendarQueryDto, CreatePlanningDto, PlanningQueryDto, UpdatePlanningDto } from './dto/planning.dto';
import { DtoPipe } from '../../common/http/validation';
import { CurrentUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import type { AccessClaims } from '../auth/tokens';
import type { PlanningAction } from '../../common/planning-transitions';

/**
 * Planning (Increment 8): pitches + assignments. The API is the editorial
 * source of truth; role gating in the dashboard never replaces these guards.
 * Reviewers get a scoped queue (own items + in-review), never writes.
 */
@Controller('planning')
export class PlanningController {
  constructor(@Inject(PlanningService) private readonly planning: PlanningService) {}

  private actor(user: AccessClaims): PlanningActor {
    return { sub: user.sub, role: user.role };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  create(
    @Body(new DtoPipe(CreatePlanningDto)) dto: CreatePlanningDto,
    @CurrentUser() user: AccessClaims,
  ) {
    return this.planning.create(dto, user.sub);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor', 'reviewer')
  list(
    @Query(new DtoPipe(PlanningQueryDto)) query: PlanningQueryDto,
    @CurrentUser() user: AccessClaims,
  ) {
    return this.planning.list(query, this.actor(user));
  }

  @Get('calendar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor', 'reviewer')
  calendar(
    @Query(new DtoPipe(CalendarQueryDto)) query: CalendarQueryDto,
    @CurrentUser() user: AccessClaims,
  ) {
    return this.planning.calendar(
      query.from ? new Date(query.from) : undefined,
      query.to ? new Date(query.to) : undefined,
      this.actor(user),
    );
  }

  @Get('review-queue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor', 'reviewer')
  reviewQueue(@CurrentUser() user: AccessClaims) {
    return this.planning.reviewQueue(this.actor(user));
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor', 'reviewer')
  read(@Param('id') id: string, @CurrentUser() user: AccessClaims) {
    return this.planning.read(id, this.actor(user));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  update(
    @Param('id') id: string,
    @Body(new DtoPipe(UpdatePlanningDto)) dto: UpdatePlanningDto,
    @CurrentUser() user: AccessClaims,
  ) {
    return this.planning.update(id, dto, user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  async remove(@Param('id') id: string, @CurrentUser() user: AccessClaims): Promise<void> {
    await this.planning.remove(id, user.sub);
  }

  private transition(
    id: string,
    action: PlanningAction,
    user: AccessClaims,
    opts?: { assigneeId?: string; reviewerId?: string },
  ) {
    return this.planning.transition(id, action, user.sub, opts);
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  assign(
    @Param('id') id: string,
    @Body(new DtoPipe(AssignPlanningDto)) dto: AssignPlanningDto,
    @CurrentUser() user: AccessClaims,
  ) {
    return this.transition(id, 'assign', user, { assigneeId: dto.assigneeId, reviewerId: dto.reviewerId });
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  start(@Param('id') id: string, @CurrentUser() user: AccessClaims) {
    return this.transition(id, 'start', user);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  submit(@Param('id') id: string, @CurrentUser() user: AccessClaims) {
    return this.transition(id, 'submit', user);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor', 'reviewer')
  complete(@Param('id') id: string, @CurrentUser() user: AccessClaims) {
    return this.transition(id, 'complete', user);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  cancel(@Param('id') id: string, @CurrentUser() user: AccessClaims) {
    return this.transition(id, 'cancel', user);
  }

  @Post(':id/reopen')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  reopen(@Param('id') id: string, @CurrentUser() user: AccessClaims) {
    return this.transition(id, 'reopen', user);
  }
}
