import StatusCodes from '../config/StatusCodes.config';
import logger from '../lib/logger';
import cache from '../services/cache';
import { JWTAuthPayload, JWTOtpPayload, JWTDownloadRequestPayload, OtpActionType } from 'custom';
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { LINK_ACCESS_CONTROL, Sessions, TRANSFER_STATUS } from '@prisma/client';
import db from '../services/db';
import jwtConfig from '../config/jwt.config';
import otpConfig from '../config/otp.config';
import cacheConfig from '../config/cache.config';
import transferConfig from '../config/transfer.config';

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
  const authHeader = req.headers[otpConfig.authorizationHeader];
  if (typeof authHeader === 'string') {
    const match = authHeader.match(/^Bearer (.+)$/);
    return match ? match[1] : null;
  }
  return null;
};

export const requireOtp = (expected: OtpActionType) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = extractOtpToken(req);
    if (!token) {
      res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Missing or malformed OTP token' });
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

export const verifyLinkAccess = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { slug } = req.params;

    // Check if user has access to the link
    db.linkTransfers
      .findUnique({ where: { slug }, include: { link_accesses: true, transfer: { select: { id: true, owner_user_id: true, status: true } } } })
      .then((linkTransfer) => {
        if (!linkTransfer) {
          return res.status(StatusCodes.NOT_FOUND).json({ message: 'Link not found' });
        }

        // Check if link transfer is active
        if (linkTransfer.transfer.status !== TRANSFER_STATUS.ACTIVE) {
          return res.status(StatusCodes.FORBIDDEN).json({ message: 'Link transfer is not active' });
        }

        // No checks needed for public links
        if (linkTransfer.access_control === LINK_ACCESS_CONTROL.PUBLIC) {
          next();
          return;
        }

        verifyToken()(req, res, () => {
          // If link only requires authentication, proceed
          if (linkTransfer.access_control === LINK_ACCESS_CONTROL.REQUIRE_AUTH) {
            next();
            return;
          }

          if (linkTransfer.access_control === LINK_ACCESS_CONTROL.PRIVATE) {
            const userId = req.session.userId;

            // Allow if user is the owner of the transfer
            if (linkTransfer.transfer.owner_user_id === userId) {
              next();
              return;
            }

            // Check if user is in the allowed access list
            const hasAccess = linkTransfer.link_accesses.some((access) => access.user_id === userId);
            if (hasAccess) {
              next();
              return;
            } else {
              return res.status(StatusCodes.FORBIDDEN).json({ message: 'Access to this link is restricted' });
            }
          }
        });
      })
      .catch((error) => {
        authMiddlewareLogger.error(error, 'Error verifying link access');
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
      });
  };
};

const extractTransferToken = (req: Request): string | null => {
  const authHeader = req.get(transferConfig.downloadAuthorizationHeader);
  if (typeof authHeader === 'string') {
    const match = authHeader.match(/^Bearer (.+)$/);
    return match ? match[1] : null;
  }
  return null;
};

export const verifyDownloadToken = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = extractTransferToken(req);

      if (!token) {
        res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Missing or malformed download token' });
        return;
      }

      // Verify the token
      let payload: JWTDownloadRequestPayload;

      try {
        payload = jwt.verify(token, process.env.TRANSFER_TOKEN_SECRET) as JWTDownloadRequestPayload;
      } catch {
        res.status(StatusCodes.UNAUTHORIZED).json({ message: "Couldn't verify download token" });
        return;
      }

      if (!payload) {
        res.status(StatusCodes.UNAUTHORIZED).json({ message: "Couldn't verify download token" });
        return;
      }

      const valid = await cache.get(`${cacheConfig.ID_Prefix.Download_Request}${payload.tid}:${payload.id}`);

      // If token has been cleared from cache then it is no longer valid
      if (!valid) {
        res.status(StatusCodes.UNAUTHORIZED).json({ message: "Couldn't verify download token" });
        return;
      }

      req.downloadRequest = payload;
      next();
    } catch (error) {
      authMiddlewareLogger.error(error, 'Error verifying transfer token');
      res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Unauthorized' });
    }
  };
};
