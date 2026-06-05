import { keepPreviousData, useQuery } from "@tanstack/react-query";
import queryKeys from "./queryKeys";
import { getAnalyticsOverview, AnalyticsData } from "@/api/services/analyticsService";

const useAnalyticsQuery = (timeframe: string) => {
  return useQuery<AnalyticsData>({
    queryKey: queryKeys.analytics.overview(timeframe),
    queryFn: ({ signal }) => getAnalyticsOverview(timeframe, signal),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export default useAnalyticsQuery;
