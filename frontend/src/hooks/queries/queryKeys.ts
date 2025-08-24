import { GetTransfersQuery } from "@/api/services/transferService";

export default {
  transfers: {
    all: ["/transfers"],
    list: (query: GetTransfersQuery) => ["/transfers", ...Object.values(query)],
    details: (id: string) => [`/transfers/${id}`],
  },
};
