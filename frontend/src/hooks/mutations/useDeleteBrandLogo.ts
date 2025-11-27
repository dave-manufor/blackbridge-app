import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteBrandLogo } from '@/api/services/imageService';
import toast from 'react-hot-toast';

export const useDeleteBrandLogo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await deleteBrandLogo();
    },
    onSuccess: () => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['brand-settings'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      
      toast.success('Brand logo deleted successfully!');
    },
    onError: (error: any) => {
      console.error('Error deleting brand logo:', error);
      toast.error(error.response?.data?.message || 'Failed to delete brand logo');
    },
  });
};
