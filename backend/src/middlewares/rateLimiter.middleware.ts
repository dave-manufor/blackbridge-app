import otpConfig from '../config/otp.config';
import { rateLimit } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import cache from '../services/cache';
import authConfig from '../config/auth.config';

export const otpVerificationLimiter = rateLimit({
  windowMs: otpConfig.rateLimitWindow,
  max: otpConfig.rateLimitMax,
  message: 'Too many verification attempts. Please try again after 10 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.session.userId, // Rate limit by user ID
  store: new RedisStore({
    sendCommand: (...args: string[]) => cache.sendCommand(args),
  }),
});

export const authRateLimiter = rateLimit({
  windowMs: authConfig.rateLimitWindow,
  max: authConfig.rateLimitMax,
  message: 'Too many login attempts. Please try again later.',
  store: new RedisStore({
    sendCommand: (...args: string[]) => cache.sendCommand(args),
  }),
});
