import {
  GetTransfersResponse,
  markTransfersAsViewed,
  TransferDetailsData,
} from "@/api/services/transferService";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../queries";

const useMarkTransferAsViewedMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { transfer_id: string }) =>
      markTransfersAsViewed(data.transfer_id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.count });
      // Replace is_viewed flag for transfer details
      queryClient.setQueryData(
        queryKeys.transfers.details(variables.transfer_id),
        (oldData: TransferDetailsData | undefined) => ({
          ...oldData,
          is_viewed: true,
        })
      );
      // Replace is_viewed flag for transfer lists
      queryClient.setQueriesData(
        { queryKey: queryKeys.transfers.allLists },
        (oldData: GetTransfersResponse) => {
          if (!oldData) return;

          return {
            ...oldData,
            data: oldData.data.map((transfer) =>
              transfer.id === variables.transfer_id
                ? { ...transfer, is_viewed: true }
                : transfer
            ),
          };
        }
      );
    },
  });
};
export default useMarkTransferAsViewedMutation;
