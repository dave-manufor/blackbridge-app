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
  },
};
