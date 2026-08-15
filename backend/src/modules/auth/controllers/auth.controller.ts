import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { AuthService } from '../services/auth.service';
import { authResetService } from '../services/auth-reset.service';
import { AUTH_CONSTANTS } from '../constants/auth.constants';
import { sendResponse } from '../../../common/responses/response.helper';
import { LoginDto } from '../dto/auth.dto';

const buildAuthCookieOptions = (options: { httpOnly: boolean; maxAge?: number }) => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: options.httpOnly,
    secure: isProduction,
    sameSite: isProduction ? ('strict' as const) : ('lax' as const),
    path: '/',
    ...options.maxAge && { maxAge: options.maxAge },
  };
};

const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim().length > 0) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return String(forwarded[0]);
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
};

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  getCsrfToken = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const existing = req.cookies?.[AUTH_CONSTANTS.CSRF_COOKIE_NAME];
      const token = existing || randomBytes(24).toString('hex');
      
      if (!existing) {
        res.cookie(AUTH_CONSTANTS.CSRF_COOKIE_NAME, token, buildAuthCookieOptions({ httpOnly: false }));
      }
      sendResponse(res, 200, { csrfToken: token });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto: LoginDto = req.body;
      const ipAddress = getClientIp(req);
      
      const { response, refreshToken } = await this.authService.login(dto, ipAddress);

      const persistSession = dto.rememberDevice !== false;

      res.cookie(
        AUTH_CONSTANTS.ADMIN_TOKEN_COOKIE,
        response.token,
        buildAuthCookieOptions({ httpOnly: true, ...(persistSession ? { maxAge: AUTH_CONSTANTS.ACCESS_TOKEN_TTL_MS } : {}) })
      );

      res.cookie(
        AUTH_CONSTANTS.ADMIN_REFRESH_COOKIE,
        refreshToken,
        buildAuthCookieOptions({ httpOnly: true, ...(persistSession ? { maxAge: AUTH_CONSTANTS.REFRESH_TOKEN_TTL_MS } : {}) })
      );

      sendResponse(res, 200, response);
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const refreshToken = req.cookies?.[AUTH_CONSTANTS.ADMIN_REFRESH_COOKIE] || null;
      await this.authService.logout(refreshToken);

      res.clearCookie(AUTH_CONSTANTS.ADMIN_TOKEN_COOKIE, buildAuthCookieOptions({ httpOnly: true }));
      res.clearCookie(AUTH_CONSTANTS.ADMIN_REFRESH_COOKIE, buildAuthCookieOptions({ httpOnly: true }));
      res.clearCookie(AUTH_CONSTANTS.CSRF_COOKIE_NAME, buildAuthCookieOptions({ httpOnly: false }));

      sendResponse(res, 200, { success: true });
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const refreshToken = req.cookies?.[AUTH_CONSTANTS.ADMIN_REFRESH_COOKIE] || null;
      const { response, nextRefreshToken } = await this.authService.refresh(refreshToken);

      res.cookie(
        AUTH_CONSTANTS.ADMIN_TOKEN_COOKIE,
        response.token,
        buildAuthCookieOptions({ httpOnly: true, maxAge: AUTH_CONSTANTS.ACCESS_TOKEN_TTL_MS })
      );

      res.cookie(
        AUTH_CONSTANTS.ADMIN_REFRESH_COOKIE,
        nextRefreshToken,
        buildAuthCookieOptions({ httpOnly: true, maxAge: AUTH_CONSTANTS.REFRESH_TOKEN_TTL_MS })
      );

      sendResponse(res, 200, response);
    } catch (error) {
      next(error);
    }
  };

  getMe = async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        throw new Error('Authentication required');
      }
      const user = await this.authService.getMe(req.user.id);
      sendResponse(res, 200, { user });
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body;
      const ipAddress = getClientIp(req);
      const userAgent = req.headers['user-agent'];
      const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : undefined);
      const result = await authResetService.requestPasswordReset(email, ipAddress, userAgent, origin);
      sendResponse(res, 200, result);
    } catch (error) {
      next(error);
    }
  };

  verifyResetToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token, email } = req.body;
      const result = await authResetService.verifyResetToken(token, email);
      sendResponse(res, 200, result);
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token, email, password } = req.body;
      const ipAddress = getClientIp(req);
      const result = await authResetService.completePasswordReset(token, email, password, ipAddress);
      sendResponse(res, 200, result);
    } catch (error) {
      next(error);
    }
  };
}
