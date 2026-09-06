import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ProblemBody {
  type: string;
  title: string;
  status: number;
  code: string;
  detail: string;
  errors?: Array<{ field: string; code: string; message: string }>;
}

/**
 * RFC7807-style envelope with stable machine codes (API Contract v1.1).
 * 401 vs 403 stay strict; 404 never distinguishes missing locale vs slug.
 */
@Catch()
export class ProblemExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse() as Record<string, unknown> | string;
      const body = this.toProblem(status, payload, req);
      res.status(status).json(body);
      return;
    }

    console.error('[unhandled]', exception);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      type: 'https://newshub.local/problems/internal',
      title: 'Internal server error',
      status: 500,
      code: 'internal_error',
      detail: 'An unexpected error occurred.',
    } satisfies ProblemBody);
  }

  private toProblem(
    status: number,
    payload: Record<string, unknown> | string,
    req: Request,
  ): ProblemBody {
    const explicitCode =
      typeof payload === 'object' && typeof payload['code'] === 'string'
        ? (payload['code'] as string)
        : undefined;
    const code = explicitCode ?? this.code(status);
    const base = {
      type: `https://newshub.local/problems/${code.replace(/_/g, '-')}`,
      title: typeof payload === 'object' && typeof payload['error'] === 'string'
        ? (payload['error'] as string)
        : this.title(status),
      status,
      code,
      detail: typeof payload === 'object' && typeof payload['message'] === 'string'
        ? (payload['message'] as string)
        : `${req.method} ${req.path}`,
    };
    if (typeof payload === 'object' && Array.isArray(payload['message'])) {
      return {
        ...base,
        code: 'validation_failed',
        detail: 'Validation failed.',
        errors: (payload['message'] as string[]).map((message) => ({
          field: this.fieldOf(message),
          code: 'invalid',
          message,
        })),
      };
    }
    return base;
  }

  private title(status: number): string {
    switch (status) {
      case 400: return 'Bad request';
      case 401: return 'Unauthorized';
      case 403: return 'Forbidden';
      case 404: return 'Not found';
      case 409: return 'Conflict';
      case 422: return 'Unprocessable entity';
      default: return 'Error';
    }
  }

  private code(status: number): string {
    switch (status) {
      case 400: return 'bad_request';
      case 401: return 'unauthorized';
      case 403: return 'forbidden';
      case 404: return 'not_found';
      case 409: return 'conflict';
      case 422: return 'validation_failed';
      default: return 'error';
    }
  }

  private fieldOf(message: string): string {
    const match = /^([^ ]+)/.exec(message);
    return match ? match[1] : 'unknown';
  }
}
