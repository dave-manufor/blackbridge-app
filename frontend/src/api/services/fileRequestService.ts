import {
  CreateFileRequestPayload,
  CreateFileRequestResponse,
  FileRequestListResponse,
  FileRequestDetailsResponse,
} from "../../types/fileRequest";
import API from "../API";

export const createFileRequest = async (
  payload: CreateFileRequestPayload
): Promise<CreateFileRequestResponse> => {
  const res = await API.post("/transfers/requests", payload);
  return res.data?.data;
};

export interface GetTransferRequestsQuery {
  page?: number;
  limit?: number;
  direction?: string;
  status?: string;
  search?: string;
}

export const getFileRequests = async (
  params?: GetTransferRequestsQuery
): Promise<FileRequestListResponse> => {
  const res = await API.get("/transfers/requests", {
    params,
  });
  return {
    data: res.data?.data,
    pagination: res?.data?.pagination,
  };
};

export const getFileRequestDetails = async (
  requestId: string
): Promise<FileRequestDetailsResponse> => {
  const res = await API.get(`/transfers/requests/${requestId}`);
  return res.data?.data;
};
