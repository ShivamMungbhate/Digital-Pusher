import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';
import { User, IUser } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { AppError } from '../middlewares/errorHandler.js';
import { AuthRequest } from '../middlewares/auth.js';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['senior', 'family']),
    phone: z.string().optional(),
    preferredLanguage: z.string().default('en')
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required')
  })
});

export const refreshSchema = z.object({
  body: z
    .object({
      refreshToken: z.string().optional()
    })
    .optional()
});

const generateTokens = (user: IUser) => {
  const accessToken = jwt.sign(
    { userId: user._id.toString(), role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as any }
  );

  const refreshToken = jwt.sign(
    { userId: user._id.toString() },
    env.REFRESH_TOKEN_SECRET,
    { expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as any }
  );

  return { accessToken, refreshToken };
};

const setTokenCookies = (res: Response, accessToken: string, refreshToken: string) => {
  const isProd = env.NODE_ENV === 'production';
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, role, phone, preferredLanguage } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new AppError('Email is already registered', 409, 'USER_EXISTS');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
      phone,
      preferredLanguage: preferredLanguage || 'en'
    });

    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshToken = refreshToken;
    await user.save();

    setTokenCookies(res, accessToken, refreshToken);

    await AuditLog.create({
      userId: user._id,
      action: 'USER_REGISTER',
      resourceType: 'User',
      resourceId: user._id.toString(),
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        phone: user.phone
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshToken = refreshToken;
    await user.save();

    setTokenCookies(res, accessToken, refreshToken);

    await AuditLog.create({
      userId: user._id,
      action: 'USER_LOGIN',
      resourceType: 'User',
      resourceId: user._id.toString(),
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        phone: user.phone
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user) {
      req.user.refreshToken = undefined;
      await req.user.save();

      await AuditLog.create({
        userId: req.user._id,
        action: 'USER_LOGOUT',
        resourceType: 'User',
        resourceId: req.user._id.toString(),
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
    }

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      throw new AppError('Refresh token required', 401, 'UNAUTHORIZED');
    }

    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, env.REFRESH_TOKEN_SECRET);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) {
      throw new AppError('Invalid refresh token session', 401, 'INVALID_REFRESH_TOKEN');
    }

    const tokens = generateTokens(user);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

    res.json({
      message: 'Token refreshed',
      tokens
    });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401, 'UNAUTHORIZED');
    }

    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        phone: req.user.phone,
        preferredLanguage: req.user.preferredLanguage,
        createdAt: req.user.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
};
