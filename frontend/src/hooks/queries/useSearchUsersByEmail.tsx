import { keepPreviousData, useQuery } from "@tanstack/react-query";
import queryKeys from "./queryKeys";
import { searchUsersByEmail } from "@/api/services/userService";

const useSearchUsersByEmail = ({ query }: { query: string }) => {
  return useQuery({
    queryKey: queryKeys.users.searchByEmail(query),
    queryFn: async ({ signal }) => searchUsersByEmail(query, signal),
    enabled: query.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: keepPreviousData,
    refetchInterval: Infinity,
  });
};

export default useSearchUsersByEmail;
