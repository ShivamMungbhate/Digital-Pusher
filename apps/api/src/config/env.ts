import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  MONGO_URI: z.string().default('mongodb://localhost:27017/digital_pusher'),
  REDIS_URL: z.string().optional(),

  JWT_SECRET: z.string().min(16).default('super_secret_jwt_key_for_hackathon_demo_32chars!'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  REFRESH_TOKEN_SECRET: z.string().min(16).default('refresh_secret_jwt_key_hackathon_32chars!'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),

  STORAGE_TYPE: z.enum(['local', 'gcs']).default('local'),
  STORAGE_PATH: z.string().default('./uploads'),
  STORAGE_ENCRYPTION_KEY: z
    .string()
    .default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  MEDIA_RETENTION_DAYS: z.coerce.number().default(7),

  AI_SERVICE_URL: z.string().default('http://127.0.0.1:5001'),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('Digital Pusher <no-reply@digitalpusher.org>'),

  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().default('DigitalPusherBot'),

  ENABLE_TWILIO: z.coerce.boolean().default(false),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
});

export const env = envSchema.parse(process.env);
