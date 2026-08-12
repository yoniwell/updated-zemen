import { AuthRepository } from './repositories/auth.repository';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { createAuthRoutes } from './routes/auth.routes';

// Manual Dependency Injection
const authRepository = new AuthRepository();
const authService = new AuthService(authRepository);
const authController = new AuthController(authService);

export const authRoutes = createAuthRoutes(authController);
