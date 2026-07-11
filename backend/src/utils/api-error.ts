import { Response } from 'express';

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTH_REQUIRED'
  | 'AUTH_INVALID'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'BAD_REQUEST'
  | 'INTERNAL_ERROR';

export function sendApiError(
  res: Response,
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: unknown
): void {
  res.status(status).json({
    error: {
      code,
      message,
      details: details ?? null,
    },
  });
}

export const sendValidationError = (res: Response, message: string, details?: unknown): void => {
  sendApiError(res, 400, 'VALIDATION_ERROR', message, details);
};

export const sendPermissionError = (res: Response, message: string): void => {
  sendApiError(res, 403, 'PERMISSION_DENIED', message);
};

export const sendAuthRequiredError = (res: Response, message = 'Authentication required'): void => {
  sendApiError(res, 401, 'AUTH_REQUIRED', message);
};

export const sendAuthInvalidError = (res: Response, message = 'Invalid or expired token'): void => {
  sendApiError(res, 401, 'AUTH_INVALID', message);
};
