import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { SyndicationService } from './syndication.service';
import { CreateWebhookDto, UpdateWebhookDto } from './dto/webhook.dto';
import { DtoPipe } from '../../common/http/validation';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { CurrentUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import type { AccessClaims } from '../auth/tokens';

/**
 * Public syndication feeds (Increment 10, Part A). Published content only,
 * no authentication, no backend writes. The storefront sitemap is untouched.
 */
@Controller('syndication')
export class SyndicationController {
  constructor(@Inject(SyndicationService) private readonly syndication: SyndicationService) {}

  @Get('feed.xml')
  async feed(@Res() res: Response): Promise<void> {
    const { xml } = await this.syndication.feedXml();
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300');
    res.send(xml);
  }

  @Get('feed/:category.xml')
  async feedByCategory(@Param('category') category: string, @Res() res: Response): Promise<void> {
    const { xml, empty } = await this.syndication.feedXml(category);
    if (empty) {
      res.status(HttpStatus.NOT_FOUND).json({
        type: 'https://newshub.local/problems/not-found',
        title: 'Not found',
        status: 404,
        code: 'not_found',
        detail: 'Category not found.',
      });
      return;
    }
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300');
    res.send(xml);
  }
}

/**
 * Outbound webhook administration (Increment 10, Part B). Admin only.
 * Secrets are returned exactly once (create/rotate) and never stored,
 * listed, audited, or logged in clear.
 */
@Controller('webhooks')
export class WebhooksController {
  constructor(@Inject(SyndicationService) private readonly syndication: SyndicationService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  create(
    @Body(new DtoPipe(CreateWebhookDto)) dto: CreateWebhookDto,
    @CurrentUser() user: AccessClaims,
  ) {
    return this.syndication.createSubscription(dto, user.sub);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  list() {
    return this.syndication.listSubscriptions();
  }

  @Get(':id/deliveries')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  deliveries(
    @Param('id') id: string,
    @Query(new DtoPipe(ListQueryDto)) query: ListQueryDto,
  ) {
    return this.syndication.listDeliveries(id, query.page, query.limit);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  update(
    @Param('id') id: string,
    @Body(new DtoPipe(UpdateWebhookDto)) dto: UpdateWebhookDto,
    @CurrentUser() user: AccessClaims,
  ) {
    return this.syndication.updateSubscription(id, dto, user.sub);
  }

  @Post(':id/rotate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  rotate(@Param('id') id: string, @CurrentUser() user: AccessClaims) {
    return this.syndication.rotateSecret(id, user.sub);
  }

  @Post(':id/ping')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  ping(@Param('id') id: string, @CurrentUser() user: AccessClaims) {
    return this.syndication.ping(id, user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async remove(@Param('id') id: string, @CurrentUser() user: AccessClaims): Promise<void> {
    await this.syndication.removeSubscription(id, user.sub);
  }
}
