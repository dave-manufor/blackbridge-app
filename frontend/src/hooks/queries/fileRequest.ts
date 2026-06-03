import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createFileRequest,
  getFileRequests,
  getFileRequestDetails,
  GetTransferRequestsQuery,
} from "../../api/services/fileRequestService";
import queryKeys from "./queryKeys";
import { CreateFileRequestPayload } from "@/types/fileRequest";

export const useFileRequests = (params: GetTransferRequestsQuery = {}) =>
  useQuery({
    queryKey: queryKeys.fileRequests.list(params),
    queryFn: () => getFileRequests(params),
  });

export const useFileRequestDetails = (requestId: string) =>
  useQuery({
    queryKey: queryKeys.fileRequests.detail(requestId),
    queryFn: () => getFileRequestDetails(requestId),
    enabled: !!requestId,
  });

export const useCreateFileRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateFileRequestPayload) =>
      createFileRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fileRequests.all });
    },
  });
};
