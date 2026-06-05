import { API } from "..";

export interface AnalyticsData {
  totals: {
    transfers: number;
    storage: number;
    downloads: number;
  };
  trends: {
    transfers: number;
    storage: number;
    downloads: number;
  };
  chartData: Array<{
    name: string;
    transfers: number;
    size: number;
  }>;
  typeBreakdown: Array<{
    name: string;
    transfers: number;
  }>;
}

export const getAnalyticsOverview = async (
  timeframe: string,
  signal?: AbortSignal
): Promise<AnalyticsData> => {
  const response = await API.get(`/analytics/overview`, {
    params: { timeframe },
    signal,
  });
  return response.data?.data as AnalyticsData;
};
