import {
  LINK_TRANSFER_ACCESS_CONTROL,
  TRANSFER_DIRECTION,
  TRANSFER_STATUS,
  TRANSFER_TYPES,
} from "@/config/constants/transfers";
import { API, ApiRoutes } from "..";
import { PaginatedResponse } from "@/custom";
import PUBLIC_API from "../PUBLIC_API";

type InitializeTransferPayload = {
  title?: string;
  description?: string;
  duration: number;
  isLink: boolean;
  is_password_protected?: boolean;
  access_control?: (typeof LINK_TRANSFER_ACCESS_CONTROL)[keyof typeof LINK_TRANSFER_ACCESS_CONTROL];
  recipients?: string[];
} & (
  | {
      isLink: true;
      is_password_protected: boolean;
      access_control: (typeof LINK_TRANSFER_ACCESS_CONTROL)[keyof typeof LINK_TRANSFER_ACCESS_CONTROL];
    }
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
  transfer_type: (typeof TRANSFER_TYPES)[keyof typeof TRANSFER_TYPES];
  title: string | null;
  description: string | null;
  status: (typeof TRANSFER_STATUS)[keyof typeof TRANSFER_STATUS];
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
  is_viewed: boolean;
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
  transfer_type: (typeof TRANSFER_TYPES)[keyof typeof TRANSFER_TYPES];
  title: string | null;
  description: string | null;
  status: (typeof TRANSFER_STATUS)[keyof typeof TRANSFER_STATUS];
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
    slug: string;
    transfer_id: string;
    file_key: string;
    encrypted_fragment: string;
    access_control: (typeof LINK_TRANSFER_ACCESS_CONTROL)[keyof typeof LINK_TRANSFER_ACCESS_CONTROL];
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
  is_viewed: boolean;
} & { is_owner: true; owner_file_key: string };

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

export async function getUnviewedTransfersCount(
  signal?: AbortSignal
): Promise<number> {
  const response = await API.get(ApiRoutes.transfer.getUnviewedTransfersCount, {
    signal,
  });
  return response.data?.data.count as number;
}

export async function markTransfersAsViewed(
  transfer_id: string,
  signal?: AbortSignal
): Promise<void> {
  await API.post(
    ApiRoutes.transfer.markTransfersAsViewed({ transfer_id }),
    {},
    { signal }
  );
}

export type LinkTransferData = {
  id: string;
  slug: string;
  file_key: string;
  is_password_protected: boolean;
  transfer: {
    id: string;
    owner: {
      email: string;
      profile_picture: string | null;
    };
    title: string | null;
    description: string | null;
    files: {
      id: string;
      name: string;
      size: number;
      content_type: string;
      metadata: object | null;
    }[];
  };
  recommended_title: string;
  total_files_count: number;
  total_files_size_bytes: number;
  created_at: string;
};

export async function getLinkTransfer(
  slug: string,
  signal?: AbortSignal
): Promise<LinkTransferData> {
  const endpoint = ApiRoutes.transfer.getLinkTransfer({ slug });
  const response = await PUBLIC_API.get(endpoint, { signal });
  return response.data?.data as LinkTransferData;
}

export type RequestDownloadResponse = {
  transfer: {
    id: string;
    owner_user_id: string;
    status: string;
    expiration_date: string;
    files: Array<{
      id: string;
      name: string;
      size: number;
      content_type: string;
      metadata: object | null;
      blocks: Array<{
        id: string;
        file_id: string;
        index: number;
        size: number;
        encrypted_size: number;
        path: string;
      }>;
    }>;
  };
  token: string;
};

export async function requestDownload(
  identifier: string,
  type: (typeof TRANSFER_TYPES)[keyof typeof TRANSFER_TYPES],
  signal?: AbortSignal
): Promise<RequestDownloadResponse> {
  let endpoint: string;
  switch (type) {
    case TRANSFER_TYPES.EMAIL:
      endpoint = ApiRoutes.transfer.getEmailTransferDownloadRequest({
        transferId: identifier,
      });
      break;
    case TRANSFER_TYPES.LINK:
      endpoint = ApiRoutes.transfer.getLinkTransferDownloadRequest({
        slug: identifier,
      });
      break;
    default:
      throw new Error("Invalid transfer type");
  }
  const response = await API.get(endpoint, { signal });

  return response.data?.data as RequestDownloadResponse;
}

type FileBlockDownloadDetails = {
  file_id: string;
  file_name: string;
  block_index: number;
  download_url: string;
};

type GetDownloadUrlsResponse = Array<FileBlockDownloadDetails>;

export async function getDownloadUrls(
  fileId: string,
  token: string,
  signal?: AbortSignal
): Promise<GetDownloadUrlsResponse> {
  const endpoint = ApiRoutes.transfer.getDownloadUrls({ fileId });
  const response = await API.get(endpoint, {
    signal,
    headers: {
      "x-download-authorization": `Bearer ${token}`,
    },
  });
  return response.data?.data as GetDownloadUrlsResponse;
}
