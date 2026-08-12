import { Response } from 'express';

interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: any;
}

export function sendResponse<T>(
  res: Response,
  statusCode: number,
  data: T,
  message?: string,
  meta?: any
): void {
  const response: SuccessResponse<T> = {
    success: true,
    data,
  };

  if (message) response.message = message;
  if (meta) response.meta = meta;

  res.status(statusCode).json(response);
}
