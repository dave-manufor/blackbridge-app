import StatusCodesConfig from '../config/StatusCodes.config';
import { generateChallenge, verifyClientProof } from '../lib/crypto';
import logger from '../lib/logger';
import db, { useSerializableTransaction } from '../services/db';
import { v4 as uuid_v4 } from 'uuid';
import express, { Request, Response } from 'express';
import { z } from 'zod';
import srpConfig from '../config/srp.config';
import cache, { deleteUserSessions } from '../services/cache';
import jwt from 'jsonwebtoken';
import jwtConfig from '../config/jwt.config';
import otpConfig from '../config/otp.config';
import { JWTAuthPayload, JWTOtpPayload, OtpRequest } from 'custom';
import { requireOtp, verifyToken } from '../middlewares/auth.middleware';
import { bodyValidator } from '../middlewares/validation.middleware';
import { hashOTP, hashRefreshToken, verifyOTPHash, verifyRefreshTokenHash } from '../utils/hashing.utils';
import { authRateLimiter, otpVerificationLimiter } from '../middlewares/rateLimiter.middleware';
import cacheConfig from '../config/cache.config';
import { generateOTP } from '../utils/otp.utils';
import notificationService from '../services/notifications';
import { runBackgroundTask } from '../utils/background.utils';
import { isBetaTesting } from '../utils/dev.utils';
import { isEnrolledTester } from '../services/resend';

class AuthController {
  public path = '/auth';
  public router = express.Router();
  private authLogger = logger.child({ module: 'Auth Controller' });

  constructor() {
    this.initializeRoutes();
    this.authLogger.trace('Auth Controller initialized');
  }

  private initializeRoutes() {
    this.router.post('/register', this.validateBody('register'), this.register);
    this.router.post('/challenge', authRateLimiter, this.validateBody('challenge'), this.challenge);
    this.router.post('/', authRateLimiter, this.validateBody('signIn'), this.signIn);
    this.router.post('/logout', this.logout);
    this.router.post('/refresh', this.refreshToken);
    this.router.post(
      '/verification/request',
      verifyToken({ bypassVerification: true }),
      this.validateBody('requestVerification'),
      this.requestVerification,
    );
    this.router.post(
      '/verification/confirm',
      verifyToken({ bypassVerification: true }),
      otpVerificationLimiter,
      this.validateBody('confirmVerification'),
      this.confirmVerification,
    );
    this.router.post('/change-password', verifyToken(), requireOtp('PASSWORD_RESET'), this.validateBody('changePassword'), this.changePassword);
    this.router.get('/sessions', verifyToken(), this.getSessions);
    this.router.get('/sessions/:id/revoke', verifyToken(), this.revokeSession);
    this.router.put('/sessions/local/key', verifyToken({ bypassVerification: true }), this.validateBody('putSessionKey'), this.putLocalSessionKey);
    this.router.get('/sessions/local/key', verifyToken({ bypassVerification: true }), this.getLocalSessionKey);
  }

  private register = async (req: Request, res: Response) => {
    const { identifier, salt, verifier, public_key, private_key, key_salt } = req.body as BodyTypeToShape<'register'>;
    try {
      if (isBetaTesting()) {
        const isEnrolled = await isEnrolledTester(identifier);
        if (!isEnrolled) {
          res.status(StatusCodesConfig.FORBIDDEN).json({
            message: 'You are not an enrolled beta tester',
          });
          return;
        }
      }

      const normalizedIdentifier = identifier.toLowerCase().trim();
      useSerializableTransaction(async (tx) => {
        const existingUser = await tx.users.findUnique({
          where: { email: normalizedIdentifier },
        });

        if (existingUser) {
          res.status(StatusCodesConfig.BAD_REQUEST).json({
            message: 'User already exists',
          });
          return;
        } else {
          const user = await tx.users.create({
            data: {
              email: normalizedIdentifier,
              salt,
              verifier,
            },
          });
          await tx.keys.create({
            data: {
              private_key,
              public_key,
              salt: key_salt,
              user_id: user.id,
              primary: true,
            },
          });
          res.status(StatusCodesConfig.CREATED).json({
            message: 'User registered successfully',
          });
          return;
        }
      });
    } catch (error) {
      this.authLogger.error(error, 'Error registering user');
      res.status(StatusCodesConfig.INTERNAL_SERVER_ERROR).json({
        message: 'Internal Server Error',
      });
    }
  };

  private requestVerification = async (req: Request, res: Response) => {
    const { userId } = req.session;
    const { action_type } = req.body as BodyTypeToShape<'requestVerification'>;
    try {
      // Check cool down period for user
      const COOLDOWN_PREFIX = cacheConfig.ID_Prefix.OTP_Cooldown;
      const cooldownKey = `${COOLDOWN_PREFIX}${userId}`;
      const activeCooldown = await cache.get(cooldownKey);
      if (activeCooldown) {
        const ttl = await cache.ttl(cooldownKey);
        const cooldownAt = Date.now() + ttl * 1000; // Convert from seconds to milliseconds
        res.status(StatusCodesConfig.TOO_MANY_REQUESTS).json({
          message: `Please wait for the cooldown period to expire before requesting a new OTP`,
          data: {
            cooldown_at: cooldownAt,
          },
        });
        return;
      }
      // Generate and store hashed OTP
      const code = generateOTP();
      const hashedCode = await hashOTP(code);

      const requestID = uuid_v4();

      const data = JSON.stringify({
        user_id: userId,
        action_type,
        hashed_code: hashedCode,
      } as OtpRequest);

      const OTP_REQUEST_PREFIX = cacheConfig.ID_Prefix.OTP_Request;
      const otpRequestKey = `${OTP_REQUEST_PREFIX}${requestID}`;
      await cache.setEx(otpRequestKey, otpConfig.requestValidDuration / 1000, data);

      // Set new cooldown period
      await cache.setEx(cooldownKey, otpConfig.cooldownDuration / 1000, 'true');

      // Send OTP
      // TODO: Implement sending after notification service has been developed

      this.authLogger.info(`Sending OTP ${code} to user ${userId}`); // Simulate by logging

      const cooldownAt = Date.now() + otpConfig.cooldownDuration;
      const expiresAt = Date.now() + otpConfig.requestValidDuration;
      // Respond with timestamp

      await runBackgroundTask(
        notificationService.send_otp_notification(req.session.email, code, otpConfig.requestValidDuration),
        this.authLogger,
        'Error sending OTP notification'
      );

      res.status(StatusCodesConfig.OK).json({
        message: 'OTP has been sent',
        data: {
          request_id: requestID,
          cooldown_at: cooldownAt,
          expires_at: expiresAt,
        },
      });

      return;
    } catch (error) {
      this.authLogger.error(error, 'Error requesting OTP verification');
      res.status(StatusCodesConfig.INTERNAL_SERVER_ERROR).json({
        message: 'Internal Server Error',
      });
    }
  };

  private confirmVerification = async (req: Request, res: Response) => {
    const { userId } = req.session;
    const { request_id, code } = req.body as BodyTypeToShape<'confirmVerification'>;

    try {
      // Check if Request exists or has expired
      const OTP_REQUEST_PREFIX = cacheConfig.ID_Prefix.OTP_Request;
      const otpRequestKey = `${OTP_REQUEST_PREFIX}${request_id}`;
      const storedRequest = await cache.get(otpRequestKey);
      if (!storedRequest) {
        res.status(StatusCodesConfig.BAD_REQUEST).send();
        return;
      }

      const data = JSON.parse(storedRequest) as OtpRequest;

      // Check if OTP is correct
      const isCorrect = await verifyOTPHash(code, data.hashed_code);
      if (!isCorrect) {
        res.status(StatusCodesConfig.BAD_REQUEST).send();
        return;
      }

      // Check if is same user
      if (userId !== data.user_id) {
        res.status(StatusCodesConfig.FORBIDDEN).send();
        return;
      }

      // Generate verification Token
      const tokenPayload: JWTOtpPayload = {
        userId: data.user_id,
        jti: uuid_v4(),
        actionType: data.action_type,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor((Date.now() + otpConfig.tokenValidDuration) / 1000),
      };

      const token = jwt.sign(tokenPayload, otpConfig.tokenSecret);

      // Cache token
      const OTP_TOKEN_PREFIX = cacheConfig.ID_Prefix.OTP_Token;
      const otpTokenKey = `${OTP_TOKEN_PREFIX}${tokenPayload.jti}`;
      await cache.setEx(otpTokenKey, otpConfig.tokenValidDuration / 1000, token);

      // Clean up OTP Request
      await cache.del(otpRequestKey);

      // Return token
      res.status(StatusCodesConfig.OK).json({
        message: 'Verified',
        data: {
          verification_token: token,
        },
      });
    } catch (error) {
      this.authLogger.error(error, 'Error confirming OTP');
      res.status(StatusCodesConfig.INTERNAL_SERVER_ERROR).json({
        message: 'Internal Server Error',
      });
    }
  };

  private challenge = async (req: Request, res: Response) => {
    const { identifier } = req.body as BodyTypeToShape<'challenge'>;
    try {
      const normalizedIdentifier = identifier.toLowerCase().trim();
      const user = await db.users.findUnique({
        omit: {
          verifier: false,
        },
        where: { email: normalizedIdentifier },
      });

      if (!user) {
        res.status(StatusCodesConfig.NOT_FOUND).json({
          message: 'User not found',
        });
        return;
      }

      const { serverEphemeralBase64, secretBase64 } = await generateChallenge(user.email, user.salt, user.verifier);

      const SRPSessionID = uuid_v4();
      await cache.set(SRPSessionID, JSON.stringify({ secretBase64, identifier }), {
        EX: srpConfig.challengeExpiration, // seconds
      });

      res.status(StatusCodesConfig.OK).json({
        message: 'Challenge generated successfully',
        data: {
          serverEphemeral: serverEphemeralBase64,
          salt: user.salt,
          SRPSessionID,
        },
      });
    } catch (error) {
      this.authLogger.error(error, 'Error generating challenge');
      res.status(StatusCodesConfig.INTERNAL_SERVER_ERROR).json({
        message: 'Internal Server Error',
      });
    }
  };

  private signIn = async (req: Request, res: Response) => {
    const { clientEphemeral, clientProof, SRPSessionID } = req.body as BodyTypeToShape<'signIn'>;
    const userAgent = req.useragent;

    try {
      const SRPSession = await cache.get(SRPSessionID);
      if (!SRPSession) {
        res.status(StatusCodesConfig.NOT_FOUND).json({
          message: 'Session not found or expired',
        });
        return;
      }

      const { secretBase64, identifier } = JSON.parse(SRPSession);
      const user = await db.users.findUnique({
        omit: {
          verifier: false,
        },
        where: { email: identifier },
      });

      if (!user) {
        res.status(StatusCodesConfig.NOT_FOUND).json({
          message: 'User not found',
        });
        return;
      }

      const { isValid, serverProofBase64 } = await verifyClientProof(
        identifier,
        user.salt,
        user.verifier,
        secretBase64,
        clientProof,
        clientEphemeral,
      );

      if (!isValid) {
        res.status(StatusCodesConfig.UNAUTHORIZED).json({
          message: 'Invalid Password',
        });
        return;
      }

      await cache.del(SRPSessionID);

      const sessionId = uuid_v4();
      const accessPayload: JWTAuthPayload = {
        userId: user.id,
        email: user.email,
        sessionId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor((Date.now() + jwtConfig.accessToken.duration) / 1000),
      };
      const refreshPayload: JWTAuthPayload = {
        userId: user.id,
        email: user.email,
        sessionId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor((Date.now() + jwtConfig.refreshToken.duration) / 1000),
      };
      const accessToken = jwt.sign(accessPayload, process.env.ACCESS_TOKEN_SECRET);

      const refreshToken = jwt.sign(refreshPayload, process.env.REFRESH_TOKEN_SECRET);

      const hashedRefreshToken = await hashRefreshToken(refreshToken);

      await db.sessions.create({
        data: {
          id: sessionId,
          user_agent: userAgent.source,
          browser: userAgent.browser,
          os: userAgent.os,
          platform: userAgent.platform,
          user_id: user.id,
          hashed_refresh_token: hashedRefreshToken,
          ip_address: req.ip,
          expires_at: new Date(Date.now() + jwtConfig.refreshToken.duration),
        },
      });

      res.cookie(jwtConfig.refreshToken.name, refreshToken, {
        domain: process.env.COOKIE_DOMAIN || undefined,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: jwtConfig.refreshToken.duration,
      });
      res.cookie(jwtConfig.accessToken.name, accessToken, {
        domain: process.env.COOKIE_DOMAIN || undefined,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: jwtConfig.accessToken.duration,
      });

      const device = userAgent.isMobile ? 'mobile' : userAgent.isDesktop ? 'desktop' : userAgent.isTablet ? 'tablet' : 'unknown';

      if (user && user.verified) {
        await runBackgroundTask(
          notificationService.send_signin_notification(user.email, {
            ipAddress: req.ip,
            platform: userAgent.platform,
            device,
            time: new Date(),
          }),
          this.authLogger,
          'Error sending sign-in notification'
        );
      }
      res.status(StatusCodesConfig.OK).json({
        message: 'Sign in successful',
        data: {
          serverProof: serverProofBase64,
        },
      });
    } catch (error) {
      this.authLogger.error(error, 'Error signing in user');
      res.status(StatusCodesConfig.INTERNAL_SERVER_ERROR).json({
        message: 'Internal Server Error',
      });
    }
  };

  private refreshToken = async (req: Request, res: Response) => {
    const cookies = req.cookies;
    const refreshToken = cookies[jwtConfig.refreshToken.name] as string;

    // Check if refresh token is present in cookies
    if (!refreshToken) {
      res.sendStatus(StatusCodesConfig.UNAUTHORIZED);
      return;
    }

    let payload: JWTAuthPayload;

    // Verify the refresh token
    try {
      payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET) as JWTAuthPayload;
    } catch {
      res.sendStatus(StatusCodesConfig.UNAUTHORIZED);
      return;
    }

    // Check session in the database
    try {
      const now = new Date();

      const session = await db.sessions.findFirst({
        where: { id: payload.sessionId, expires_at: { gte: now }, revoked: false },
      });

      if (!session || !(await verifyRefreshTokenHash(refreshToken, session.hashed_refresh_token))) {
        res.sendStatus(StatusCodesConfig.UNAUTHORIZED);
        return;
      }

      const accessPayload: JWTAuthPayload = {
        userId: payload.userId,
        email: payload.email,
        sessionId: payload.sessionId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor((Date.now() + jwtConfig.accessToken.duration) / 1000),
      };

      const refreshPayload: JWTAuthPayload = {
        userId: payload.userId,
        email: payload.email,
        sessionId: payload.sessionId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor((Date.now() + jwtConfig.refreshToken.duration) / 1000),
      };

      const accessToken = jwt.sign(accessPayload, process.env.ACCESS_TOKEN_SECRET);

      const newRefreshToken = jwt.sign(refreshPayload, process.env.REFRESH_TOKEN_SECRET);

      const newHashedRefreshToken = await hashRefreshToken(newRefreshToken);

      await db.sessions.update({
        where: { id: session.id },
        data: {
          hashed_refresh_token: newHashedRefreshToken,
          expires_at: new Date(Date.now() + jwtConfig.refreshToken.duration),
        },
      });

      res.cookie(jwtConfig.refreshToken.name, newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: jwtConfig.refreshToken.duration,
        domain: process.env.COOKIE_DOMAIN || undefined,
      });
      res.cookie(jwtConfig.accessToken.name, accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: jwtConfig.accessToken.duration,
        domain: process.env.COOKIE_DOMAIN || undefined,
      });

      // Send new access token to client
      res.status(StatusCodesConfig.OK).json({
        message: 'Access token refreshed successfully',
      });
    } catch (error) {
      this.authLogger.error(error, 'Error refreshing token');
      res.status(StatusCodesConfig.INTERNAL_SERVER_ERROR).json({
        message: 'Internal Server Error',
      });
    }
  };

  private logout = async (req: Request, res: Response) => {
    const cookies = req.cookies;
    const refreshToken = cookies[jwtConfig.refreshToken.name];

    try {
      if (refreshToken) {
        let session;

        try {
          session = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        } catch {
          res.sendStatus(StatusCodesConfig.UNAUTHORIZED);
          return;
        }
        // Delete session from DB
        await db.sessions.deleteMany({
          where: { id: session.sessionId },
        });

        // Delete session from cache
        await cache.del(session.sessionId);
      }

      // Clear cookie
      res.clearCookie(jwtConfig.refreshToken.name, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      });
      res.clearCookie(jwtConfig.accessToken.name, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      });

      res.status(StatusCodesConfig.OK).json({
        message: 'Logout successful',
      });
    } catch (error) {
      this.authLogger.error(error, 'Error logging out user');
      res.status(StatusCodesConfig.INTERNAL_SERVER_ERROR).json({
        message: 'Internal Server Error',
      });
    }
  };

  private changePassword = async (req: Request, res: Response) => {
    const { key, credentials } = req.body as BodyTypeToShape<'changePassword'>;
    const { userId, sessionId } = req.session;
    if (!userId) {
      res.sendStatus(StatusCodesConfig.UNAUTHORIZED);
      return;
    }

    try {
      const user = await db.users.findUnique({ where: { id: userId } });
      if (!user) {
        res.sendStatus(StatusCodesConfig.UNAUTHORIZED);
        return;
      }
      useSerializableTransaction(async (tx) => {
        await tx.users.update({
          where: { id: userId },
          data: {
            salt: credentials.salt,
            verifier: credentials.verifier,
          },
        });

        await tx.keys.update({
          where: {
            single_primary_key_pair_per_user: {
              user_id: userId,
              primary: true,
            },
          },
          data: {
            private_key: key.armored_private_key,
            salt: key.salt,
            version: { increment: 1 },
          },
        });

        await tx.sessions.updateMany({
          where: {
            AND: [{ user_id: userId }, { id: { not: sessionId } }],
          },
          data: { revoked: true },
        });

        await deleteUserSessions(userId);
      });

      res.status(StatusCodesConfig.OK).json({
        message: 'Password updated successfully',
      });
    } catch (error) {
      this.authLogger.error(error, 'Error changing password');
      res.status(StatusCodesConfig.INTERNAL_SERVER_ERROR).json({
        message: 'Internal Server Error',
      });
    }
  };

  private revokeSession = async (req: Request, res: Response) => {
    // TODO: Implement revoke logic
    res.send('Revoke session');
  };

  private getSessions = async (req: Request, res: Response) => {
    // TODO: Implement getSessions logic
    res.send('Get Sessions');
  };

  private putLocalSessionKey = async (req: Request, res: Response) => {
    const { key } = req.body as BodyTypeToShape<'putSessionKey'>;
    const { userId, sessionId } = req.session;

    try {
      await db.sessions.update({
        where: { user_id: userId, id: sessionId },
        data: { session_key: key },
      });

      res.status(StatusCodesConfig.OK).json({
        message: 'Session key updated successfully',
      });
    } catch (error) {
      this.authLogger.error(error, 'Error updating session key');
      res.status(StatusCodesConfig.INTERNAL_SERVER_ERROR).json({
        message: 'Internal Server Error',
      });
    }
  };

  private getLocalSessionKey = async (req: Request, res: Response) => {
    const { userId, sessionId } = req.session;

    try {
      const session = await db.sessions.findFirst({
        where: { user_id: userId, id: sessionId },
      });

      if (!session) {
        res.sendStatus(StatusCodesConfig.NOT_FOUND);
        return;
      }

      res.status(StatusCodesConfig.OK).json({
        message: 'Session key retrieved successfully',
        data: {
          session_key: session.session_key,
        },
      });
    } catch (error) {
      this.authLogger.error(error, 'Error retrieving session key');
      res.status(StatusCodesConfig.INTERNAL_SERVER_ERROR).json({
        message: 'Internal Server Error',
      });
    }
  };

  private getValidationSchema = <T extends BodyType>(type: T): SchemaMap[T] => {
    return schemas[type];
  };

  private validateBody = bodyValidator(this.getValidationSchema);
}

const registerSchema = z.object({
  identifier: z.string().email('Expected email identifier'),
  salt: z.string().base64('Expected base64 string'),
  verifier: z.string().base64('Expected base64 string'),
  public_key: z.string(),
  private_key: z.string(),
  key_salt: z.string(),
});

const challengeSchema = z.object({
  identifier: z.string().email('Expected email identifier'),
});

const signInSchema = z.object({
  clientEphemeral: z.string().base64('Expected base64 string'),
  clientProof: z.string().base64('Expected base64 string'),
  SRPSessionID: z.string(),
});

const requestVerificationSchema = z.object({
  action_type: z.enum([...Object.values(otpConfig.actionTypes)] as [string, ...string[]]),
});

const confirmVerificationSchema = z.object({
  request_id: z.string(),
  code: z.string(),
});

const putSessionKeySchema = z.object({
  key: z.string(),
});

const changePasswordSchema = z.object({
  credentials: z.object({
    salt: z.string().base64('Expected base64 string'),
    verifier: z.string().base64('Expected base64 string'),
  }),
  key: z.object({
    armored_private_key: z.string(),
    salt: z.string(),
  }),
});

const schemas = {
  register: registerSchema,
  challenge: challengeSchema,
  signIn: signInSchema,
  putSessionKey: putSessionKeySchema,
  requestVerification: requestVerificationSchema,
  confirmVerification: confirmVerificationSchema,
  changePassword: changePasswordSchema,
} as const;

type SchemaMap = typeof schemas;
type BodyType = keyof SchemaMap;
type BodyTypeToShape<T extends BodyType> = z.infer<SchemaMap[T]>;

export default AuthController;
