import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBrandLogoPresignedUrl,
  confirmBrandLogoUpload,
  deleteBrandLogo,
  uploadImageToS3,
} from '@/api/services/imageService';
import toast from 'react-hot-toast';

/**
 * Hook for uploading brand logo
 */
export const useUploadBrandLogo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      // Step 1: Get presigned URL
      const { url, key } = await getBrandLogoPresignedUrl(file.type, file.size);

      // Step 2: Upload to S3
      await uploadImageToS3(url, file);

      // Step 3: Confirm upload
      await confirmBrandLogoUpload(key);

      return key;
    },
    onSuccess: () => {
      // Invalidate queries to refetch brand settings with new logo
      queryClient.invalidateQueries({ queryKey: ['brand-settings'] });
      toast.success('Brand logo updated successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to upload brand logo';
      toast.error(message);
    },
  });
};

/**
 * Hook for deleting brand logo
 */
export const useDeleteBrandLogo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteBrandLogo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-settings'] });
      toast.success('Brand logo deleted successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to delete brand logo';
      toast.error(message);
    },
  });
};
