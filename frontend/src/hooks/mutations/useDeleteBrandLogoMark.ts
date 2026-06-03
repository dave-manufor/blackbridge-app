import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteBrandLogoMark } from '@/api/services/imageService';
import toast from 'react-hot-toast';

export const useDeleteBrandLogoMark = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await deleteBrandLogoMark();
    },
    onSuccess: () => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['brand-settings'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      
      toast.success('Logo mark deleted successfully!');
    },
    onError: (error: any) => {
      console.error('Error deleting logo mark:', error);
      toast.error(error.response?.data?.message || 'Failed to delete logo mark');
    },
  });
};
