import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';import { AuthorsService } from './authors.service';
import { CreateAuthorDto, UpdateAuthorDto } from './dto/author-write.dto';
import { Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { DtoPipe } from '../../common/http/validation';

/**
 * Editorial authors surface (F2). No public GETs in v1 — authors are
 * embedded in articles/opinions responses.
 */
@Controller('authors')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'editor')
export class AuthorsController {
  constructor(@Inject(AuthorsService) private readonly authors: AuthorsService) {}

  @Get()
  list() {
    return this.authors.list();
  }

  @Get(':id')
  read(@Param('id') id: string) {
    return this.authors.read(id);
  }

  @Post()
  create(@Body(new DtoPipe(CreateAuthorDto)) dto: CreateAuthorDto) {
    return this.authors.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body(new DtoPipe(UpdateAuthorDto)) dto: UpdateAuthorDto) {
    return this.authors.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.authors.remove(id);
  }
}
