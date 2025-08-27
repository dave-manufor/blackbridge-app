import { keepPreviousData, useQuery } from "@tanstack/react-query";
import queryKeys from "./queryKeys";
import {
  getTransfers,
  GetTransfersQuery,
  GetTransfersResponse,
} from "@/api/services/transferService";

const useGetTransfersQuery = (query: GetTransfersQuery) => {
  return useQuery<GetTransfersResponse>({
    queryKey: queryKeys.transfers.list(query),
    queryFn: ({ signal }) => getTransfers(query, signal),
    placeholderData: keepPreviousData,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
};

export default useGetTransfersQuery;
