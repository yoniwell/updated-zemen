import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import prisma from '../config/database';

export const auditLog = (action: string, targetType: string) => {
  return async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.user) {
        const targetId = req.params.id || req.body?.id || null;
        await prisma.auditLog.create({
          data: {
            userId: req.user.id,
            action,
            targetType,
            targetId,
            details: JSON.stringify({
              method: req.method,
              path: req.path,
              body: req.method !== 'GET' ? req.body : undefined,
            }),
            ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
          },
        });
      }
    } catch (error) {
      console.error('Audit log error:', error);
    }
    next();
  };
};
