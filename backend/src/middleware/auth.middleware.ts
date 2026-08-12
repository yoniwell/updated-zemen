import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../database/prisma';
import { AppError } from '../common/errors/AppError';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    branchId: string | null;
    name: string;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    
    // Quick extract cookie token (in production use cookie-parser)
    let cookieToken = null;
    if (req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map(c => c.trim());
      const sessionCookie = cookies.find(c => c.startsWith('zemen_admin_token='));
      if (sessionCookie) cookieToken = decodeURIComponent(sessionCookie.replace('zemen_admin_token=', ''));
    }

    const token = bearerToken || cookieToken;
    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new AppError('JWT_SECRET is not configured', 500);

    const decoded = jwt.verify(token, secret) as any;

    const user = await prisma.adminUser.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true, branchId: true, name: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 401);
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
      name: user.name,
    };

    next();
  } catch (error) {
    next(new AppError('Invalid or expired token', 401));
  }
};
