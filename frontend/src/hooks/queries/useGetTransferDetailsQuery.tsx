import {
  getTransferDetails,
  TransferDetailsData,
} from "@/api/services/transferService";
import { useQuery } from "@tanstack/react-query";
import queryKeys from "./queryKeys";

const useGetTransferDetailsQuery = (transferId: string) => {
  return useQuery<TransferDetailsData>({
    queryKey: queryKeys.transfers.details(transferId),
    queryFn: () => getTransferDetails(transferId),
    enabled: !!transferId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export default useGetTransferDetailsQuery;
