import { ArgumentMetadata, Type, ValidationPipe, ValidationPipeOptions } from '@nestjs/common';

const OPTIONS: ValidationPipeOptions = {
  whitelist: true,
  transform: true,
  forbidNonWhitelisted: true,
};

/**
 * Validation pipe with an explicit DTO class.
 *
 * Nest resolves the DTO from TypeScript decorator metadata, which esbuild
 * (tsx dev server) does not emit. Without this, body/query validation is
 * silently skipped in dev while working in tsc builds and tests — a
 * dev/prod divergence. Passing the class explicitly behaves identically
 * under every runtime. The global pipe in main.ts stays as a backstop.
 */
export class DtoPipe extends ValidationPipe {
  constructor(private readonly dto: Type<unknown>) {
    super(OPTIONS);
  }

  async transform(value: unknown, metadata: ArgumentMetadata) {
    return super.transform(value, { ...metadata, metatype: this.dto });
  }
}
