import { AuthRepository } from '../repositories/auth.repository';
import { LoginDto } from '../dto/auth.dto';
import { AppError } from '../../../common/errors/AppError';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { AUTH_CONSTANTS } from '../constants/auth.constants';

export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  async login(dto: LoginDto, ipAddress: string) {
    const user = await this.authRepository.findUserByEmail(dto.email);
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const hashToCompare: string = user.passwordHash ? String(user.passwordHash) : '';
    const isValid = await bcrypt.compare(dto.password ?? '', hashToCompare);
    if (!isValid) {
      throw new AppError('Invalid credentials', 401);
    }

    if (!user.isActive) {
      throw new AppError('User account is disabled', 403);
    }

    const token = this.generateToken(user);
    const refreshToken = this.generateRefreshToken(user);

    await this.authRepository.updateUserLastLogin(user.id);

    return {
      response: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
      refreshToken
    };
  }

  async logout(refreshToken: string | null) {
    // If you are tracking sessions in db, delete them here
    return true;
  }

  async refresh(refreshToken: string | null) {
    if (!refreshToken) {
      throw new AppError('No refresh token provided', 401);
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret') as any;
      const user = await this.authRepository.findUserById(decoded.id);

      if (!user || !user.isActive) {
        throw new AppError('Invalid token or user disabled', 401);
      }

      const newToken = this.generateToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      return {
        response: {
          token: newToken,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          }
        },
        nextRefreshToken: newRefreshToken
      };
    } catch (error) {
      throw new AppError('Invalid refresh token', 401);
    }
  }

  async getMe(id: string) {
    const user = await this.authRepository.findUserById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  private generateToken(user: any) {
    return jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: AUTH_CONSTANTS.ACCESS_TOKEN_TTL_MS / 1000 }
    );
  }

  private generateRefreshToken(user: any) {
    return jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret',
      { expiresIn: AUTH_CONSTANTS.REFRESH_TOKEN_TTL_MS / 1000 }
    );
  }
}
