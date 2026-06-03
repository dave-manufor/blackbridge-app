import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProfilePicturePresignedUrl,
  confirmProfilePictureUpload,
  deleteProfilePicture,
  uploadImageToS3,
} from '@/api/services/imageService';
import toast from 'react-hot-toast';

/**
 * Hook for uploading profile picture
 */
export const useUploadProfilePicture = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      // Step 1: Get presigned URL
      const { url, key } = await getProfilePicturePresignedUrl(file.type, file.size);

      // Step 2: Upload to S3
      await uploadImageToS3(url, file);

      // Step 3: Confirm upload
      await confirmProfilePictureUpload(key);

      return key;
    },
    onSuccess: () => {
      // Invalidate queries to refetch user data with new profile picture
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      toast.success('Profile picture updated successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to upload profile picture';
      toast.error(message);
    },
  });
};

/**
 * Hook for deleting profile picture
 */
export const useDeleteProfilePicture = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProfilePicture,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      toast.success('Profile picture deleted successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to delete profile picture';
      toast.error(message);
    },
  });
};
