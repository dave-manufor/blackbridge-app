import { GetTransferRequestsQuery } from "@/api/services/fileRequestService";
import { GetTransfersQuery } from "@/api/services/transferService";

export default {
  transfers: {
    all: ["/transfers"],
    count: ["/transfers", "count"],
    allLists: ["/transfers", "list"],
    list: (query: GetTransfersQuery) => [
      "/transfers",
      "list",
      ...Object.values(query),
    ],
    details: (id: string) => ["/transfers", "details", id],
    p2pSessionDetails: (sessionId: string) => [
      "/transfers",
      "p2p_session",
      sessionId,
    ],
    publicLinkDetails: (slug: string) => ["/transfers", "public_link", slug],
  },
  users: {
    searchByEmail: (query: string) => ["/users", "search", query],
  },
  fileRequests: {
    all: ["/file-requests"],
    list: (params: GetTransferRequestsQuery) => [
      "/file-requests",
      "list",
      ...Object.values(params),
    ],
    detail: (id: string) => ["/file-requests", "detail", id],
  },
  analytics: {
    overview: (timeframe: string) => ["/analytics", "overview", timeframe],
  },
};
