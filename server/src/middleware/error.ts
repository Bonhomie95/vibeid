import { Request, Response, NextFunction } from 'express';

export class HttpError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: 'not_found', message: 'Route not found' });
}

// Express requires 4 args to recognize this as an error handler.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.code || 'error', message: err.message });
    return;
  }
  const e = err as { name?: string; message?: string };
  if (e?.name === 'ValidationError') {
    res.status(400).json({ error: 'validation_error', message: e.message });
    return;
  }
  // eslint-disable-next-line no-console
  console.error('[error]', err);
  res.status(500).json({ error: 'internal_error', message: 'Something went wrong' });
}
