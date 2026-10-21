import pino from 'pino';

export const logger = pino({
  level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'passwordHash',
      'token',
      'refreshToken',
      'aadhaar',
      'cardNumber',
      'phone',
      'email',
      'rawMedia',
      'buffer'
    ],
    censor: '[REDACTED]'
  },
  transport:
    process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname'
          }
        }
      : undefined
});
