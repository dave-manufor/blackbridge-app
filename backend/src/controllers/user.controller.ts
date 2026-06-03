import logger from '../lib/logger';
import express, { Request, Response } from 'express';
import { z } from 'zod';
import StatusCodesConfig from '../config/StatusCodes.config';
import { requireOtp, verifyToken } from '../middlewares/auth.middleware';
import db from '../services/db';
import { bodyValidator } from '../middlewares/validation.middleware';
import notificationService from '../services/notifications';
import { runBackgroundTask } from '../utils/background.utils';
import { prettyZodErrors } from '../utils/zod.utils';


class UserController {
  public path = '/users';
  public router = express.Router();
  private userLogger = logger.child({ module: 'User Controller' });

  constructor() {
    this.initializeRoutes();
    this.userLogger.trace('User Controller initialized');
  }

  private initializeRoutes() {
    this.router.get('/search', verifyToken(), this.searchUsersByEmail);
    this.router.get('/me', verifyToken({ bypassVerification: true }), this.getCurrentUser);
    this.router.post('/me/verify', verifyToken({ bypassVerification: true }), requireOtp('ACCOUNT_VERIFICATION'), this.verifyCurrentUserAccount);
    this.router.post('/keys', verifyToken(), this.validateBody('getPublicKeys'), this.getPublicKeys);
    this.router.get('/brand-settings', verifyToken(), this.getBrandSettings);
    this.router.post('/brand-settings', verifyToken(), this.validateBody('createBrandSettings'), this.createBrandSettings);
    this.router.put('/brand-settings', verifyToken(), this.validateBody('updateBrandSettings'), this.updateBrandSettings);
  }

  private searchUsersByEmail = async (req: Request, res: Response) => {
    const query = req.query;

    const querySchema = z.object({
      search: z.string(),
    });

    const parseResult = querySchema.safeParse(query);
    if (!parseResult.success) {
      const errors = prettyZodErrors(parseResult.error);
      res.status(StatusCodesConfig.BAD_REQUEST).json({ message: 'Invalid query parameters', errors });
      return;
    }

    const { search } = parseResult.data;

    try {
      const users = await db.users.findMany({
        where: {
          email: {
            startsWith: search,
          },
        },
        select: {
          id: true,
          email: true,
        },
        take: 10,
      });

      res.status(StatusCodesConfig.OK).json({
        message: 'Users retrieved successfully',
        data: users,
      });
    } catch (error) {
      this.userLogger.error(error, 'Error searching users by email');
      res.status(StatusCodesConfig.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
    }
  };

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

      // Import getImageDownloadUrl if profile_picture exists
      const { getImageDownloadUrl } = await import('../services/image');
      const profile_picture_url = user.profile_picture ? await getImageDownloadUrl(user.profile_picture) : null;

      res.status(StatusCodesConfig.OK).json({
        message: 'User retrieved successfully',
        data: {
          ...user,
          profile_picture_url,
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
      await runBackgroundTask(
        notificationService.send_welcome_notification(req.session.email),
        this.userLogger,
        'Error sending welcome notification'
      );
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

  private getBrandSettings = async (req: Request, res: Response) => {
    const { userId } = req.session;

    try {
      const brandSettings = await db.brandSettings.findUnique({
        where: { user_id: userId },
      });

      if (!brandSettings) {
        res.status(StatusCodesConfig.NOT_FOUND).json({ message: 'Brand settings not found' });
        return;
      }

      // Generate presigned URL for logo and logo_mark if they exist
      const { getImageDownloadUrl } = await import('../services/image');
      const logoUrl = brandSettings.logo ? await getImageDownloadUrl(brandSettings.logo) : null;
      const logoMarkUrl = brandSettings.logo_mark ? await getImageDownloadUrl(brandSettings.logo_mark) : null;

      res.status(StatusCodesConfig.OK).json({
        message: 'Brand settings retrieved successfully',
        data: {
          ...brandSettings,
          logo_url: logoUrl,
          logo_mark_url: logoMarkUrl,
        },
      });
    } catch (error) {
      this.userLogger.error(error, 'Error fetching brand settings');
      res.status(StatusCodesConfig.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
    }
  };

  private createBrandSettings = async (req: Request, res: Response) => {
    const { userId } = req.session;
    const { name, logo, primary_color, secondary_color, enabled } = req.body as BodyTypeToShape<'createBrandSettings'>;

    try {
      const existingBrandSettings = await db.brandSettings.findUnique({
        where: { user_id: userId },
      });

      if (existingBrandSettings) {
        res.status(StatusCodesConfig.CONFLICT).json({ message: 'Brand settings already exist' });
        return;
      }

      const brandSettings = await db.brandSettings.create({
        data: {
          user_id: userId,
          name,
          logo,
          primary_color,
          secondary_color,
          enabled,
        },
      });

      // Generate presigned URL for logo if it exists
      const { getImageDownloadUrl } = await import('../services/image');
      const logoUrl = brandSettings.logo ? await getImageDownloadUrl(brandSettings.logo) : null;

      res.status(StatusCodesConfig.CREATED).json({
        message: 'Brand settings created successfully',
        data: {
          ...brandSettings,
          logo_url: logoUrl,
        },
      });
    } catch (error) {
      this.userLogger.error(error, 'Error creating brand settings');
      res.status(StatusCodesConfig.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
    }
  };

  private updateBrandSettings = async (req: Request, res: Response) => {
    const { userId } = req.session;
    const { name, logo, primary_color, secondary_color, enabled } = req.body as BodyTypeToShape<'updateBrandSettings'>;

    try {
      const brandSettings = await db.brandSettings.update({
        where: { user_id: userId },
        data: {
          name,
          logo,
          primary_color,
          secondary_color,
          enabled,
        },
      });

      // Generate presigned URL for logo if it exists
      const { getImageDownloadUrl } = await import('../services/image');
      const logoUrl = brandSettings.logo ? await getImageDownloadUrl(brandSettings.logo) : null;

      res.status(StatusCodesConfig.OK).json({
        message: 'Brand settings updated successfully',
        data: {
          ...brandSettings,
          logo_url: logoUrl,
        },
      });
    } catch (error) {
      this.userLogger.error(error, 'Error updating brand settings');
      res.status(StatusCodesConfig.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
    }
  };

  private getValidationSchema<T extends BodyType>(type: T): SchemaMap[T] {
    return schemas[type];
  }

  private validateBody = bodyValidator(this.getValidationSchema);
}

type BodyType = 'getPublicKeys' | 'createBrandSettings' | 'updateBrandSettings';

const getPublicKeysSchema = z.object({
  emails: z.array(z.string().email()).nonempty(),
});

const createBrandSettingsSchema = z.object({
  name: z.string(),
  logo: z.string().optional(),
  primary_color: z.string().optional(),
  secondary_color: z.string().optional(),
  enabled: z.boolean().optional(),
});

const updateBrandSettingsSchema = z.object({
  name: z.string().optional(),
  logo: z.string().optional(),
  primary_color: z.string().optional(),
  secondary_color: z.string().optional(),
  enabled: z.boolean().optional(),
});

const schemas = {
  getPublicKeys: getPublicKeysSchema,
  createBrandSettings: createBrandSettingsSchema,
  updateBrandSettings: updateBrandSettingsSchema,
} as const;

type SchemaMap = typeof schemas;

type BodyTypeToShape<T extends BodyType> = z.infer<SchemaMap[T]>;

export default UserController;
