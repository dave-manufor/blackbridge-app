import {
  TRANSFER_DIRECTION,
  TRANSFER_STATUS,
  TRANSFER_TYPES,
} from "@/config/constants/transfers";
import { API, ApiRoutes } from "..";
import { PaginatedResponse } from "@/custom";

type InitializeTransferPayload = {
  title?: string;
  description?: string;
  duration: number;
  isLink: boolean;
  is_password_protected?: boolean;
  recipients?: string[];
} & (
  | { isLink: true; is_password_protected: boolean }
  | { isLink: false; recipients: string[] }
);
export async function initializeTransfer(
  payload: InitializeTransferPayload,
  signal?: AbortSignal
): Promise<string> {
  try {
    const endpoint = payload.isLink
      ? ApiRoutes.transfer.initiateLinkTransfer
      : ApiRoutes.transfer.initiateEmailTransfer;
    const response = await API.post(endpoint, payload, { signal });
    return response.data?.data?.transfer_id as string;
  } catch (error) {
    throw new Error(`Failed to initiate transfer: ${error}`);
  }
}

export type CommitTransferPayload = {
  transfer_id: string;
  isLink: boolean;
  owner_key: string;
  recipient_keys?: {
    email: string;
    file_key: string;
  };
  link_key?: string;
  fragment?: string;
} & (
  | {
      isLink: true;
      link_key: string;
      fragment: string;
    }
  | {
      isLink: false;
      recipient_keys: {
        email: string;
        file_key: string;
      };
    }
);

export async function commitTransfer(
  payload: CommitTransferPayload,
  signal?: AbortSignal
) {
  try {
    const endpoint = payload.isLink
      ? ApiRoutes.transfer.commitLinkTransfer({
          transferId: payload.transfer_id,
        })
      : ApiRoutes.transfer.commitEmailTransfer({
          transferId: payload.transfer_id,
        });
    await API.post(endpoint, payload, { signal });
  } catch (error) {
    throw new Error(`Failed to commit transfer: ${error}`);
  }
}

export type GetTransfersQuery = {
  page?: number;
  limit?: number;
  direction?: (typeof TRANSFER_DIRECTION)[keyof typeof TRANSFER_DIRECTION];
  status?: (typeof TRANSFER_STATUS)[keyof typeof TRANSFER_STATUS];
  type?: (typeof TRANSFER_TYPES)[keyof typeof TRANSFER_TYPES];
  search?: string;
};

export type TransferData = {
  id: string;
  owner_user_id: string;
  transfer_type: string;
  title: string | null;
  description: string | null;
  status: string;
  expiration_date: string;
  created_at: string;
  updated_at: string;
  owner: {
    id: string;
    email: string;
    profile_picture: string | null;
  };
  files: {
    name: string;
    size: number;
    content_type: string;
  }[];
  recommended_title: string;
  total_files_count: number;
  total_files_size_bytes: number;
  is_owner: boolean;
  is_expired: boolean;
};

export type GetTransfersResponse = PaginatedResponse<TransferData>;
export async function getTransfers(
  query: GetTransfersQuery,
  signal?: AbortSignal
): Promise<GetTransfersResponse> {
  const response = await API.get(ApiRoutes.transfer.getTransfers, {
    params: query,
    signal,
  });

  return {
    data: response.data?.data,
    pagination: response?.data?.pagination,
  };
}

export type TransferDetailsData = {
  id: string;
  owner_user_id: string;
  transfer_type: string;
  title: string | null;
  description: string | null;
  status: string;
  expiration_date: string;
  created_at: string;
  updated_at: string;
  owner: {
    id: string;
    email: string;
    profile_picture: string | null;
  };
  email_transfers: {
    id: string;
    file_key: string;
    created_at: string;
    recipient_user: {
      id: string;
      email: string;
      profile_picture: string | null;
    };
  }[];
  link_transfer: {
    id: string;
    transfer_id: string;
    file_key: string;
    encrypted_fragment: string;
    is_password_protected: boolean;
    download_limit: number | null;
    download_count: number;
    last_accessed: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  files: {
    id: string;
    user_id: string;
    transfer_id: string;
    status: string;
    name: string;
    size: number;
    content_type: string;
    metadata: object | null;
    created_at: string;
    updated_at: string;
  }[];
  recommended_title: string;
  total_files_count: number;
  total_files_size_bytes: number;
  is_owner: boolean;
  is_expired: boolean;
};

export async function getTransferDetails(
  transferId: string,
  signal?: AbortSignal
): Promise<TransferDetailsData> {
  const endpoint = ApiRoutes.transfer.getTransferDetails({
    transferId,
  });
  const response = await API.get(endpoint, { signal });
  return response.data?.data as TransferDetailsData;
}
