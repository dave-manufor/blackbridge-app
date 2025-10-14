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
    publicLinkDetails: (slug: string) => ["/transfers", "public_link", slug],
  },
  users: {
    searchByEmail: (query: string) => ["/users", "search", query],
  },
};
