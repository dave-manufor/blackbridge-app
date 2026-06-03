export interface FileRequestFile {
  id?: string;
  name: string;
  description?: string;
}

export interface CreateFileRequestPayload {
  recipient_identifier: string;
  title?: string;
  description?: string;
  files: FileRequestFile[];
}
export interface FileRequestDetailsResponse {
  id: string;
  title?: string;
  description?: string;
  status: string;
  created_at: string;
  requester: {
    id: string;
    email: string;
    profile_picture?: string;
  };
  recipient: {
    id: string;
    email: string;
    profile_picture?: string;
  };
  files: FileRequestFile[];
  transfer?: {
    id: string;
    owner_user_id: string;
    status: string;
    expiration_date: string;
    owner_file_key?: string;
    email_transfers?: Array<{ recipient_user_id: string; file_key?: string }>;
  };
  requester_key?: string;
  owner_file_key?: string;
  is_requester?: boolean;
  is_recipient?: boolean;
  fulfilled?: boolean;
}

export interface FileRequestListResponse {
  data: FileRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface CreateFileRequestResponse {
  request_id: string;
}

export interface InitiateRequestFulfillmentPayload {
  request_id: string;
  duration: number;
}

export interface CommitRequestFulfillmentPayload {
  request_id: string;
  owner_key: string;
  requester_key: string;
}
