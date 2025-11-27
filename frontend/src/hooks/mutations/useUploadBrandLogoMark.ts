import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getBrandLogoMarkPresignedUrl, confirmBrandLogoMarkUpload } from '@/api/services/imageService';
import toast from 'react-hot-toast';
import axios from 'axios';

export const useUploadBrandLogoMark = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      // Step 1: Get presigned URL
      const { url, key } = await getBrandLogoMarkPresignedUrl(file.type, file.size);

      // Step 2: Upload file to S3
      await axios.put(url, file, {
        headers: {
          'Content-Type': file.type,
        },
      });

      // Step 3: Confirm upload
      await confirmBrandLogoMarkUpload(key);

      return key;
    },
    onSuccess: () => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['brand-settings'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      
      toast.success('Logo mark uploaded successfully!');
    },
    onError: (error: any) => {
      console.error('Error uploading logo mark:', error);
      toast.error(error.response?.data?.message || 'Failed to upload logo mark');
    },
  });
};
