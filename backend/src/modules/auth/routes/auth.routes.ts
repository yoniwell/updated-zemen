import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../../../middleware/validate.middleware';
import { loginSchema, forgotPasswordSchema, verifyResetTokenSchema, resetPasswordSchema } from '../validation/auth.schema';
import { authenticate } from '../../../middleware/auth.middleware';

export const createAuthRoutes = (authController: AuthController): Router => {
  const router = Router();

  router.get('/csrf-token', authController.getCsrfToken);
  router.post('/login', validate({ body: loginSchema }), authController.login);
  router.post('/logout', authController.logout);
  router.post('/refresh', authController.refresh);

  // Staff Password Reset
  router.post('/forgot-password', validate({ body: forgotPasswordSchema }), authController.forgotPassword);
  router.post('/verify-reset-token', validate({ body: verifyResetTokenSchema }), authController.verifyResetToken);
  router.post('/reset-password', validate({ body: resetPasswordSchema }), authController.resetPassword);
  
  // Protected
  router.get('/me', authenticate, authController.getMe);

  return router;
};
