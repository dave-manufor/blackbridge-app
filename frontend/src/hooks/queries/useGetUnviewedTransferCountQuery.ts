import { getUnviewedTransfersCount } from "@/api/services/transferService";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import queryKeys from "./queryKeys";

const useGetUnviewedTransferCountQuery = () => {
  return useQuery<number>({
    queryKey: queryKeys.transfers.count,
    queryFn: ({ signal }) => getUnviewedTransfersCount(signal),
    staleTime: 1 * 60 * 1000, // 1 minute
    placeholderData: keepPreviousData,
  });
};

export default useGetUnviewedTransferCountQuery;
