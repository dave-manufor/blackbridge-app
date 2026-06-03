import { getImageDownloadUrl } from './image';

/**
 * Add presigned URL to user profile picture
 */
export const enrichUserWithPresignedUrl = async (user: any): Promise<any> => {
  if (!user || !user.profile_picture) return user;
  
  const profile_picture_url = await getImageDownloadUrl(user.profile_picture);
  return {
    ...user,
    profile_picture_url,
  };
};

/**
 * Add presigned URL to brand settings logo
 */
export const enrichBrandSettingsWithPresignedUrl = async (brandSettings: any): Promise<any> => {
  if (!brandSettings || !brandSettings.logo) return brandSettings;
  
  const logo_url = await getImageDownloadUrl(brandSettings.logo);
  return {
    ...brandSettings,
    logo_url,
  };
};

/** 
 * Enrich array of users with presigned URLs
 */
export const enrichUsersWithPresignedUrls = async (users: any[]): Promise<any[]> => {
  return await Promise.all(users.map(enrichUserWithPresignedUrl));
};
