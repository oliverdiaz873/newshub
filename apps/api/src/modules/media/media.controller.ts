import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { MediaService, MAX_FILE_BYTES } from './media.service';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { DtoPipe } from '../../common/http/validation';
import { CurrentUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import type { AccessClaims } from '../auth/tokens';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

@Controller('media')
export class MediaController {
  constructor(@Inject(MediaService) private readonly media: MediaService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  list(@Query(new DtoPipe(ListQueryDto)) query: ListQueryDto) {
    return this.media.list(query);
  }

  @Get(':id/content')
  async content(@Param('id') id: string, @Res() res: Response) {
    const asset = await this.media.readAsset(id);
    if (!asset) {
      res.status(HttpStatus.NOT_FOUND).json({
        type: 'https://newshub.local/problems/not-found',
        title: 'Not found',
        status: 404,
        code: 'not_found',
        detail: 'Media asset not found.',
      });
      return;
    }
    res.setHeader('Content-Type', asset.mime);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(asset.absolutePath);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_BYTES, files: 1 },
      fileFilter: (_req, file, done) => {
        if (!ALLOWED_MIME.has(file.mimetype)) {
          done(null, false);
          return;
        }
        done(null, true);
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AccessClaims,
  ) {
    return this.media.upload(
      file ? { buffer: file.buffer, size: file.size, mimetype: file.mimetype, originalname: file.originalname } : { buffer: Buffer.alloc(0), size: 0, mimetype: '', originalname: '' },
      user.sub,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  async remove(@Param('id') id: string): Promise<void> {
    await this.media.remove(id);
  }
}
