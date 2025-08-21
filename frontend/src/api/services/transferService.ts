import { API, ApiRoutes } from "..";

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
  payload: InitializeTransferPayload
): Promise<string> {
  try {
    const endpoint = payload.isLink
      ? ApiRoutes.transfer.initiateLinkTransfer
      : ApiRoutes.transfer.initiateEmailTransfer;
    const response = await API.post(endpoint, payload);
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

export async function commitTransfer(payload: CommitTransferPayload) {
  try {
    const endpoint = payload.isLink
      ? ApiRoutes.transfer.commitLinkTransfer({
          transferId: payload.transfer_id,
        })
      : ApiRoutes.transfer.commitEmailTransfer({
          transferId: payload.transfer_id,
        });
    await API.post(endpoint, payload);
  } catch (error) {
    throw new Error(`Failed to commit transfer: ${error}`);
  }
}
