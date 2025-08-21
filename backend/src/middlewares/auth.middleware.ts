import StatusCodes from '../config/StatusCodes.config';
import logger from '../lib/logger';
import cache from '../services/cache';
import { JWTAuthPayload, JWTOtpPayload, OtpActionType } from 'custom';
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Sessions } from '@prisma/client';
import db from '../services/db';
import jwtConfig from '../config/jwt.config';
import otpConfig from 'config/otp.config';
import cacheConfig from 'config/cache.config';

const authMiddlewareLogger = logger.child({ module: 'AuthMiddleware' });

export const verifyToken = (options?: { bypassVerification?: boolean }) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies[jwtConfig.accessToken.name];
    if (!token) {
      res.status(StatusCodes.UNAUTHORIZED).json({ message: 'No Auth Cookie' });
      return;
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
      if (err) {
        res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid token' });
        return;
      }

      req.session = decoded as JWTAuthPayload;

      const sessionId = req.session.sessionId;

      // Check if session is revoked
      try {
        // 1. Hit cache first
        const cached = await cache.get(sessionId);
        let session: Sessions | null = cached ? JSON.parse(cached) : null;

        // 2. If not found in cache, hit DB
        if (!session) {
          session = await db.sessions.findUnique({ where: { id: sessionId } });

          // If session is found and valid, cache it
          if (session && !session.revoked) {
            await cache.set(session.id, JSON.stringify(session), {
              EX: jwtConfig.accessToken.cacheTTL,
            });
          }
        }

        // 3. Validate session
        if (!session || session.revoked) {
          return res.status(StatusCodes.FORBIDDEN).json({ message: 'Session revoked or expired' });
        }

        // 4. Check if user is verified
        if (!options?.bypassVerification) {
          const verifiedUser = await db.users.findUnique({ where: { id: session.user_id, verified: true } });

          if (!verifiedUser) {
            return res.status(StatusCodes.FORBIDDEN).json({ message: 'User not verified' });
          }
        }

        // Session is valid
        next();
      } catch (error) {
        console.error(error);
        authMiddlewareLogger.error(error, 'Error checking session status');
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
      }
    });
  };
};
const extractOtpToken = (req: Request) => {
  const header = req.headers[otpConfig.authorizationHeader];
  if (!header || Array.isArray(header)) return null;
  const parts = header.split(' ');
  return parts.length === 2 ? parts[1] : null;
};

export const requireOtp = (expected: OtpActionType) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = extractOtpToken(req);
    if (!token) {
      res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Missing OTP token' });
      return;
    }

    try {
      let payload: JWTOtpPayload;
      try {
        payload = jwt.verify(token, otpConfig.tokenSecret) as JWTOtpPayload;
      } catch (error) {
        res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Invalid or expired OTP token' });
        return;
      }
      if (payload.actionType !== expected) {
        res.status(StatusCodes.FORBIDDEN).json({ error: 'OTP not valid for this action' });
        return;
      }

      // Ensure OTP user matches logged-in session
      const { userId } = req.session;
      if (userId && userId !== payload.userId) {
        res.status(StatusCodes.FORBIDDEN).json({ error: 'OTP does not match logged-in user' });
        return;
      }

      const OTP_TOKEN_PREFIX = cacheConfig.ID_Prefix.OTP_Token;
      const otpTokenKey = `${OTP_TOKEN_PREFIX}${payload.jti}`;
      const storedToken = await cache.get(otpTokenKey);
      if (!storedToken) {
        res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Invalid or expired OTP token' });
        return;
      }

      // Attach consumption helper
      console.log('OTP Token Key:', otpTokenKey);
      req.consumeOtpToken = async () => {
        await cache.del(otpTokenKey);
      };
      next();
    } catch (error) {
      authMiddlewareLogger.error(error, 'Error checking session status');
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
    }
  };
};
