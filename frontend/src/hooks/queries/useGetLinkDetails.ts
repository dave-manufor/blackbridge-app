import { keepPreviousData, useQuery } from "@tanstack/react-query";
import queryKeys from "./queryKeys";
import { getLinkTransfer } from "@/api/services/transferService";
import { AxiosError } from "axios";

const useGetLinkDetails = ({ slug }: { slug: string }) => {
  return useQuery({
    queryKey: queryKeys.transfers.publicLinkDetails(slug),
    queryFn: ({ signal }) => getLinkTransfer(slug, signal),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (_, error) => {
      if (error && error instanceof AxiosError) {
        // Don't retry on 401 (Unauthorized), component should redirect to sign in
        if (error.response?.status === 401) {
          return false;
        }
      }
      return true;
    },
  });
};

export default useGetLinkDetails;
