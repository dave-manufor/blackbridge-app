export interface FileBlock {
  id: string;
  path: string;
  size: number;
}

export type FileManifest = {
  algo: string;
  fileSize: number;
  totalBlocks: number;
  fileId: string;
  blocks: Array<{
    index: number;
    blockLocator: string;
    plainSha256?: string;
    cipherSha256?: string;
  }>;
  envelopeLocator?: string;
  signature?: string;
};

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
