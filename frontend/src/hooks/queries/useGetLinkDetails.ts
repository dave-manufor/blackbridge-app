import { keepPreviousData, useQuery } from "@tanstack/react-query";
import queryKeys from "./queryKeys";
import { getLinkTransfer } from "@/api/services/transferService";
import { isAxiosError } from "axios";

const useGetLinkDetails = ({ slug }: { slug: string }) => {
  return useQuery<Awaited<ReturnType<typeof getLinkTransfer>>>({
    queryKey: queryKeys.transfers.publicLinkDetails(slug),
    queryFn: ({ signal }) => getLinkTransfer(slug, signal),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: Infinity,
    retry: (failCount, error) => {
      if (error && isAxiosError(error)) {
        // Don't retry on 401 (Unauthorized), component should redirect to sign in
        // Don't retry on 403 (Forbidden), user has insufficient permissions
        // Don't retry on 404 (Not Found), link may be invalid
        if ([401, 403, 404].includes(error.response?.status || 0)) {
          return false;
        }
      }
      if (failCount > 3) {
        return false;
      }
      return true;
    },
  });
};

export default useGetLinkDetails;
