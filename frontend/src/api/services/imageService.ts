import { API } from '@/api';

/**
 * Get presigned URL for profile picture upload
 */
export const getProfilePicturePresignedUrl = async (contentType: string, size: number): Promise<{ url: string; key: string }> => {
  const response = await API.post('/api/images/profile-picture/presigned-url', {
    contentType,
    size,
  });
  return response.data.data;
};

/**
 * Confirm profile picture upload
 */
export const confirmProfilePictureUpload = async (key: string): Promise<void> => {
  await API.post('/api/images/profile-picture/confirm', { key });
};

/**
 * Delete profile picture
 */
export const deleteProfilePicture = async (): Promise<void> => {
  await API.delete('/api/images/profile-picture');
};

/**
 * Get presigned URL for brand logo upload
 */
export const getBrandLogoPresignedUrl = async (contentType: string, size: number): Promise<{ url: string; key: string }> => {
  const response = await API.post('/api/images/brand-logo/presigned-url', {
    contentType,
    size,
  });
  return response.data.data;
};

/**
 * Confirm brand logo upload
 */
export const confirmBrandLogoUpload = async (key: string): Promise<void> => {
  await API.post('/api/images/brand-logo/confirm', { key });
};

/**
 * Delete brand logo
 */
export const deleteBrandLogo = async (): Promise<void> => {
  await API.delete('/api/images/brand-logo');
};

/**
 * Get presigned URL for brand logo mark upload
 */
export const getBrandLogoMarkPresignedUrl = async (contentType: string, size: number): Promise<{ url: string; key: string }> => {
  const response = await API.post('/api/images/brand-logo-mark/presigned-url', {
    contentType,
    size,
  });
  return response.data.data;
};

/**
 * Confirm brand logo mark upload
 */
export const confirmBrandLogoMarkUpload = async (key: string): Promise<void> => {
  await API.post('/api/images/brand-logo-mark/confirm', { key });
};

/**
 * Delete brand logo mark
 */
export const deleteBrandLogoMark = async (): Promise<void> => {
  await API.delete('/api/images/brand-logo-mark');
};

/**
 * Upload image file to S3 using presigned URL
 */
export const uploadImageToS3 = async (presignedUrl: string, file: File): Promise<void> => {
  await fetch(presignedUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });
};
