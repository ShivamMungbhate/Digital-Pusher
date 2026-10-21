import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User, IUser, UserRole } from '../models/User.js';
import { AppError } from './errorHandler.js';

export interface AuthRequest extends Request {
  user?: IUser;
}

interface JwtPayload {
  userId: string;
  role: UserRole;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token = req.cookies?.accessToken;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError('Authentication token required', 401, 'UNAUTHORIZED');
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      const user = await User.findById(decoded.userId);
      if (!user) {
        throw new AppError('User not found or deleted', 401, 'USER_NOT_FOUND');
      }

      req.user = user;
      next();
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError('Invalid or expired authentication token', 401, 'INVALID_TOKEN');
    }
  } catch (err) {
    next(err);
  }
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access forbidden: requires one of [${allowedRoles.join(', ')}] role`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
};
