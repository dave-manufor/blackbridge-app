import logger from '../lib/logger';
import express, { Request, Response } from 'express';
import { z } from 'zod';
import StatusCodesConfig from '../config/StatusCodes.config';
import { requireOtp, verifyToken } from '../middlewares/auth.middleware';
import db from '../services/db';
import { bodyValidator } from '../middlewares/validation.middleware';
import notificationService from 'services/notifications';

class UserController {
  public path = '/users';
  public router = express.Router();
  private userLogger = logger.child({ module: 'User Controller' });

  constructor() {
    this.initializeRoutes();
    this.userLogger.trace('User Controller initialized');
  }

  private initializeRoutes() {
    // GET /search - Search users by email
    this.router.get('/me', verifyToken({ bypassVerification: true }), this.getCurrentUser);
    this.router.post('/me/verify', verifyToken({ bypassVerification: true }), requireOtp('ACCOUNT_VERIFICATION'), this.verifyCurrentUserAccount);
    this.router.post('/keys', verifyToken(), this.validateBody('getPublicKeys'), this.getPublicKeys);
    // PUT /me - Update current user information (not all details)
    // PUT /me/password - Update current user password
    // GET /:id/keys - Get public key of a user by ID
  }

  private getCurrentUser = async (req: Request, res: Response) => {
    const { userId } = req.session;
    if (!userId) {
      res.status(StatusCodesConfig.UNAUTHORIZED).json({ message: 'Unauthorized' });
      return;
    }

    try {
      const user = await db.users.findUnique({
        where: { id: userId },
        include: {
          keys: true,
        },
      });

      if (!user) {
        res.status(StatusCodesConfig.NOT_FOUND).json({ message: 'User not found' });
        return;
      }

      res.status(StatusCodesConfig.OK).json({
        message: 'User retrieved successfully',
        data: {
          ...user,
        },
      });
    } catch (error) {
      this.userLogger.error(error, 'Error fetching current user');
      res.status(StatusCodesConfig.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
    }
  };

  private verifyCurrentUserAccount = async (req: Request, res: Response) => {
    const { userId } = req.session;

    try {
      // Check if user if verified
      const verifiedUser = await db.users.findUnique({
        where: {
          id: userId,
          verified: true,
        },
      });

      if (verifiedUser) {
        res.status(StatusCodesConfig.BAD_REQUEST).json({
          message: 'User is already verified',
        });
        return;
      }

      // Update verification flag
      await db.users.update({
        where: {
          id: userId,
        },
        data: {
          verified: true,
        },
      });

      await req.consumeOtpToken?.();
      notificationService.send_welcome_notification(req.session.email).catch((error) => {
        this.userLogger.warn(error, 'Error sending welcome notification');
      });
      res.status(StatusCodesConfig.OK).send();
    } catch (error) {
      this.userLogger.error(error, 'Error verifying current user');
      res.status(StatusCodesConfig.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
    }
  };

  private getPublicKeys = async (req: Request, res: Response) => {
    const { emails } = req.body as BodyTypeToShape<'getPublicKeys'>;

    // Normalized email strings
    const normalizedEmails = emails.map((email) => email.toLowerCase().trim());

    try {
      // Lookup corresponding keys for users
      const publicKeys = await db.keys.findMany({
        where: {
          user: {
            email: {
              in: normalizedEmails,
            },
          },
        },
        select: {
          public_key: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      });

      // Build a map for O(1) lookups
      const userMap = new Map(publicKeys.map((key) => [key.user.email, key.public_key]));

      //Assemble results
      const results = normalizedEmails.map((email) => ({
        email,
        public_key: userMap.get(email) || null,
      }));

      res.status(StatusCodesConfig.OK).json({
        message: 'Public keys retrieved successfully',
        data: results,
      });
      return;
    } catch (error) {
      this.userLogger.error(error, 'Error fetching public keys');
      res.status(StatusCodesConfig.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
    }
  };

  private getValidationSchema<T extends BodyType>(type: T): SchemaMap[T] {
    return schemas[type];
  }

  private validateBody = bodyValidator(this.getValidationSchema);
}

type BodyType = 'getPublicKeys';

const getPublicKeysSchema = z.object({
  emails: z.array(z.string().email()).nonempty(),
});

const schemas = {
  getPublicKeys: getPublicKeysSchema,
} as const;

type SchemaMap = typeof schemas;

type BodyTypeToShape<T extends BodyType> = z.infer<SchemaMap[T]>;

export default UserController;
