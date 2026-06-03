import bucketConfig from '../config/bucket.config';
import { getPresignedUrl } from './aws';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const MAX_LOGO_SIZE = 10 * 1024 * 1024; // 10MB in bytes

export type ImageType = 'profile' | 'logo';

/**
 * Generate S3 key for storing an image
 */
export const generateImageKey = (userId: string, type: ImageType, extension: string): string => {
  const timestamp = Date.now();
  const basePath = type === 'profile' ? 'images/profiles' : 'images/brands';
  return `${basePath}/${userId}/${timestamp}.${extension}`;
};

/**
 * Validate image file properties
 */
export const validateImageFile = (contentType: string, size: number, type: ImageType): { valid: boolean; error?: string } => {
  if (!ALLOWED_IMAGE_TYPES.includes(contentType.toLowerCase())) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
    };
  }

  const maxSize = type === 'profile' ? MAX_IMAGE_SIZE : MAX_LOGO_SIZE;
  if (size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum of ${maxSize / (1024 * 1024)}MB`,
    };
  }

  return { valid: true };
};

/**
 * Get presigned URL for image upload
 */
export const getImageUploadPresignedUrl = async (key: string, contentType: string): Promise<string> => {
  return await getPresignedUrl(key, {
    type: 'upload',
    isMultiPart: false,
    expiresIn: 300, // 5 minutes
  });
};

/**
 * Get presigned download URL for image
 */
export const getImageDownloadUrl = async (key: string): Promise<string> => {
  // Images require presigned URLs for download
  return await getPresignedUrl(key, {
    type: 'download',
    expiresIn: 3600, // 1 hour
  });
};

/**
 * Extract file extension from content type
 */
export const getExtensionFromContentType = (contentType: string): string => {
  const typeMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  return typeMap[contentType.toLowerCase()] || 'jpg';
};
