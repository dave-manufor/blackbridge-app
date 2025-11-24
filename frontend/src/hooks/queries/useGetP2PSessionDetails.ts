import {
  getP2PSessionData,
  P2PSessionDetails,
} from "@/api/services/transferService";
import { useQuery } from "@tanstack/react-query";
import queryKeys from "./queryKeys";

const useGetP2PSessionDetails = (sessionId: string) => {
  return useQuery<P2PSessionDetails>({
    queryKey: queryKeys.transfers.p2pSessionDetails(sessionId),
    queryFn: ({ signal }) => getP2PSessionData(sessionId, signal),
    enabled: !!sessionId,
    refetchInterval: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};

export default useGetP2PSessionDetails;
