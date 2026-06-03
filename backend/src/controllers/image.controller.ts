import logger from '../lib/logger';
import express, { Request, Response } from 'express';
import { z } from 'zod';
import StatusCodesConfig from '../config/StatusCodes.config';
import { verifyToken } from '../middlewares/auth.middleware';
import db from '../services/db';
import { bodyValidator } from '../middlewares/validation.middleware';
import {
  generateImageKey,
  validateImageFile,
  getImageUploadPresignedUrl,
  getExtensionFromContentType,
} from '../services/image';
import { deleteObject } from '../services/aws';
import { prettyZodErrors } from '../utils/zod.utils';

class ImageController {
  public path = '/api/images';
  public router = express.Router();
  private imageLogger = logger.child({ module: 'Image Controller' });

  constructor() {
    this.initializeRoutes();
    this.imageLogger.trace('Image Controller initialized');
  }

  private initializeRoutes() {
    // Profile picture routes
    this.router.post('/profile-picture/presigned-url', verifyToken(), this.validateBody('getPresignedUrl'), this.getProfilePicturePresignedUrl);
    this.router.post('/profile-picture/confirm', verifyToken(), this.validateBody('confirmUpload'), this.confirmProfilePictureUpload);
    this.router.delete('/profile-picture', verifyToken(), this.deleteProfilePicture);

    // Brand logo routes
    this.router.post('/brand-logo/presigned-url', verifyToken(), this.validateBody('getPresignedUrl'), this.getBrandLogoPresignedUrl);
    this.router.post('/brand-logo/confirm', verifyToken(), this.validateBody('confirmUpload'), this.confirmBrandLogoUpload);
    this.router.delete('/brand-logo', verifyToken(), this.deleteBrandLogo);

    // Brand logo mark routes
    this.router.post('/brand-logo-mark/presigned-url', verifyToken(), this.validateBody('getPresignedUrl'), this.getBrandLogoMarkPresignedUrl);
    this.router.post('/brand-logo-mark/confirm', verifyToken(), this.validateBody('confirmUpload'), this.confirmBrandLogoMarkUpload);
    this.router.delete('/brand-logo-mark', verifyToken(), this.deleteBrandLogoMark);
  }

  private getProfilePicturePresignedUrl = async (req: Request, res: Response) => {
    const { userId } = req.session;
    const { contentType, size } = req.body as BodyTypeToShape<'getPresignedUrl'>;

    const validation = validateImageFile(contentType, size, 'profile');
    if (!validation.valid) {
      res.status(StatusCodesConfig.BAD_REQUEST).json({ message: validation.error });
      return;
    }

    try {
      const extension = getExtensionFromContentType(contentType);
      const key = generateImageKey(userId, 'profile', extension);
      const presignedUrl = await getImageUploadPresignedUrl(key, contentType);

      res.status(StatusCodesConfig.OK).json({
        message: 'Presigned URL generated successfully',
        data: { url: presignedUrl, key },
      });
    } catch (error) {
      this.imageLogger.error(error, 'Error generating profile picture presigned URL');
      res.status(StatusCodesConfig.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
    }
  };

  private confirmProfilePictureUpload = async (req: Request, res: Response) => {
    const { userId } = req.session;
    const { key } = req.body as BodyTypeToShape<'confirmUpload'>;

    // Verify the key belongs to this user
    if (!key.startsWith(`images/profiles/${userId}/`)) {
      res.status(StatusCodesConfig.FORBIDDEN).json({ message: 'Invalid key for this user' });
      return;
    }

    try {
      // Get the user's current profile picture to delete old one
      const currentUser = await db.users.findUnique({
        where: { id: userId },
        select: { profile_picture: true },
      });

      // Update user's profile picture
      await db.users.update({
        where: { id: userId },
        data: { profile_picture: key },
      });

      // Delete old profile picture if it exists
      if (currentUser?.profile_picture) {
        try {
          await deleteObject(currentUser.profile_picture);
        } catch (error) {
          this.imageLogger.warn(error, 'Failed to delete old profile picture');
        }
      }

      res.status(StatusCodesConfig.OK).json({ message: 'Profile picture updated successfully' });
    } catch (error) {
      this.imageLogger.error(error, 'Error confirming profile picture upload');
      res.status(StatusCodesConfig.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
    }
  };

  private deleteProfilePicture = async (req: Request, res: Response) => {
    const { userId } = req.session;

    try {
      const user = await db.users.findUnique({
        where: { id: userId },
        select: { profile_picture: true },
      });

      if (!user?.profile_picture) {
        res.status(StatusCodesConfig.NOT_FOUND).json({ message: 'No profile picture to delete' });
        return;
      }

      // Delete from S3
      await deleteObject(user.profile_picture);

      // Update user record
      await db.users.update({
        where: { id: userId },
        data: { profile_picture: null },
      });

      res.status(StatusCodesConfig.OK).json({ message: 'Profile picture deleted successfully' });
    } catch (error) {
      this.imageLogger.error(error, 'Error deleting profile picture');
      res.status(StatusCodesConfig.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
    }
  };

  private getBrandLogoPresignedUrl = async (req: Request, res: Response) => {
    const { userId } = req.session;
    const { contentType, size } = req.body as BodyTypeToShape<'getPresignedUrl'>;

    const validation = validateImageFile(contentType, size, 'logo');
    if (!validation.valid) {
      res.status(StatusCodesConfig.BAD_REQUEST).json({ message: validation.error });
      return;
    }

    try {
      const extension = getExtensionFromContentType(contentType);
      const key = generateImageKey(userId, 'logo', extension);
      const presignedUrl = await getImageUploadPresignedUrl(key, contentType);

      res.status(StatusCodesConfig.OK).json({
        message: 'Presigned URL generated successfully',
        data: { url: presignedUrl, key },
      });
    } catch (error) {
      this.imageLogger.error(error, 'Error generating brand logo presigned URL');
      res.status(StatusCodesConfig.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
    }
  };

  private confirmBrandLogoUpload = async (req: Request, res: Response) => {
    const { userId } = req.session;
    const { key } = req.body as BodyTypeToShape<'confirmUpload'>;

    // Verify the key belongs to this user
    if (!key.startsWith(`images/brands/${userId}/`)) {
      res.status(StatusCodesConfig.FORBIDDEN).json({ message: 'Invalid key for this user' });
      return;
    }

    try {
      // Get current brand settings to delete old logo
      const currentSettings = await db.brandSettings.findUnique({
        where: { user_id: userId },
        select: { logo: true },
      });

      // Update brand settings logo
      if (currentSettings) {
        await db.brandSettings.update({
          where: { user_id: userId },
          data: { logo: key },
        });
      } else {
        // Create brand settings if they don't exist
        const user = await db.users.findUnique({ where: { id: userId } });
        await db.brandSettings.create({
          data: {
            user_id: userId,
            name: user?.email.split('@')[0] || 'My Brand',
            logo: key,
            primary_color: '#000000',
            secondary_color: '#ffffff',
            enabled: false,
          },
        });
      }

      // Delete old logo if it exists
      if (currentSettings?.logo && currentSettings.logo.startsWith('images/brands/')) {
        try {
          await deleteObject(currentSettings.logo);
        } catch (error) {
          this.imageLogger.warn(error, 'Failed to delete old brand logo');
        }
      }

      res.status(StatusCodesConfig.OK).json({ message: 'Brand logo updated successfully' });
    } catch (error) {
      this.imageLogger.error(error, 'Error confirming brand logo upload');
      res.status(StatusCodesConfig.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
    }
  };

  private deleteBrandLogo = async (req: Request, res: Response) => {
    const { userId } = req.session;

    try {
      const brandSettings = await db.brandSettings.findUnique({
        where: { user_id: userId },
        select: { logo: true },
      });

      if (!brandSettings?.logo) {
        res.status(StatusCodesConfig.NOT_FOUND).json({ message: 'No brand logo to delete' });
        return;
      }

      // Delete from S3 only if it's stored in our images folder
      if (brandSettings.logo.startsWith('images/brands/')) {
        await deleteObject(brandSettings.logo);
      }

      // Update brand settings
      await db.brandSettings.update({
        where: { user_id: userId },
        data: { logo: null },
      });

      res.status(StatusCodesConfig.OK).json({ message: 'Brand logo deleted successfully' });
    } catch (error) {
      this.imageLogger.error(error, 'Error deleting brand logo');
      res.status(StatusCodesConfig.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
    }
  };

  private getBrandLogoMarkPresignedUrl = async (req: Request, res: Response) => {
    const { userId } = req.session;
    const { contentType, size } = req.body as BodyTypeToShape<'getPresignedUrl'>;

    const validation = validateImageFile(contentType, size, 'logo');
    if (!validation.valid) {
      res.status(StatusCodesConfig.BAD_REQUEST).json({ message: validation.error });
      return;
    }

    try {
      const extension = getExtensionFromContentType(contentType);
      const key = generateImageKey(userId, 'logo', extension);
      const presignedUrl = await getImageUploadPresignedUrl(key, contentType);

      res.status(StatusCodesConfig.OK).json({
        message: 'Presigned URL generated successfully',
        data: { url: presignedUrl, key },
      });
    } catch (error) {
      this.imageLogger.error(error, 'Error generating brand logo mark presigned URL');
      res.status(StatusCodesConfig.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
    }
  };

  private confirmBrandLogoMarkUpload = async (req: Request, res: Response) => {
    const { userId } = req.session;
    const { key } = req.body as BodyTypeToShape<'confirmUpload'>;

    if (!key.startsWith(`images/brands/${userId}/`)) {
      res.status(StatusCodesConfig.FORBIDDEN).json({ message: 'Invalid key for this user' });
      return;
    }

    try {
      const currentSettings = await db.brandSettings.findUnique({
        where: { user_id: userId },
        select: { logo_mark: true },
      });

      if (currentSettings) {
        await db.brandSettings.update({
          where: { user_id: userId },
          data: { logo_mark: key },
        });
      } else {
        const user = await db.users.findUnique({ where: { id: userId } });
        await db.brandSettings.create({
          data: {
            user_id: userId,
            name: user?.email.split('@')[0] || 'My Brand',
            logo_mark: key,
            primary_color: '#000000',
            secondary_color: '#ffffff',
            enabled: false,
          },
        });
      }

      if (currentSettings?.logo_mark && currentSettings.logo_mark.startsWith('images/brands/')) {
        try {
          await deleteObject(currentSettings.logo_mark);
        } catch (error) {
          this.imageLogger.warn(error, 'Failed to delete old brand logo mark');
        }
      }

      res.status(StatusCodesConfig.OK).json({ message: 'Brand logo mark updated successfully' });
    } catch (error) {
      this.imageLogger.error(error, 'Error confirming brand logo mark upload');
      res.status(StatusCodesConfig.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
    }
  };

  private deleteBrandLogoMark = async (req: Request, res: Response) => {
    const { userId } = req.session;

    try {
      const brandSettings = await db.brandSettings.findUnique({
        where: { user_id: userId },
        select: { logo_mark: true },
      });

      if (!brandSettings?.logo_mark) {
        res.status(StatusCodesConfig.NOT_FOUND).json({ message: 'No brand logo mark to delete' });
        return;
      }

      if (brandSettings.logo_mark.startsWith('images/brands/')) {
        await deleteObject(brandSettings.logo_mark);
      }

      await db.brandSettings.update({
        where: { user_id: userId },
        data: { logo_mark: null },
      });

      res.status(StatusCodesConfig.OK).json({ message: 'Brand logo mark deleted successfully' });
    } catch (error) {
      this.imageLogger.error(error, 'Error deleting brand logo mark');
      res.status(StatusCodesConfig.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
    }
  };

  private getValidationSchema<T extends BodyType>(type: T): SchemaMap[T] {
    return schemas[type];
  }

  private validateBody = bodyValidator(this.getValidationSchema);
}

type BodyType = 'getPresignedUrl' | 'confirmUpload';

const getPresignedUrlSchema = z.object({
  contentType: z.string(),
  size: z.number(),
});

const confirmUploadSchema = z.object({
  key: z.string(),
});

const schemas = {
  getPresignedUrl: getPresignedUrlSchema,
  confirmUpload: confirmUploadSchema,
} as const;

type SchemaMap = typeof schemas;

type BodyTypeToShape<T extends BodyType> = z.infer<SchemaMap[T]>;

export default ImageController;
