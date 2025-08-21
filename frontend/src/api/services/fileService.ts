import { FileBlock } from "@/custom";
import { API, ApiRoutes } from "..";
import axios, { AxiosProgressEvent } from "axios";
const MAX_UPLOAD_RETRIES = 3;

interface UploadPart {
  block_id: string;
  part_index: number;
  part_size: number;
  presigned_url: string;
}

interface RequestUploadPayload {
  transfer_id: string;
  name: string;
  content_type: string;
  size: number;
  metadata?: object;
}
export async function requestUpload(
  payload: RequestUploadPayload,
  signal?: AbortSignal
) {
  try {
    const response = await API.post(
      ApiRoutes.files.requestUpload,
      {
        transfer_id: payload.transfer_id,
        name: payload.name,
        size: payload.size,
        content_type: payload.content_type,
        metadata: payload.metadata
          ? JSON.stringify(payload.metadata)
          : undefined,
      },
      {
        signal,
      }
    );

    return response.data?.data as {
      file_id: string;
      blocks: FileBlock[];
    };
  } catch (error) {
    throw new Error(`Failed to request upload: ${error}`);
  }
}

export async function announceUpload(
  { block_id }: { block_id: string },
  signal?: AbortSignal
) {
  try {
    const response = await API.post(
      ApiRoutes.files.announceUpload,
      {
        block_id,
      },
      {
        signal,
      }
    );

    return response.data?.data as UploadPart[];
  } catch (error) {
    throw new Error(`Failed to announce upload: ${error}`);
  }
}

interface UploadPartPayload {
  fileChunk: Blob;
  part: UploadPart;
  onUploadProgress: (progressEvent: AxiosProgressEvent) => void;
}

// Do not export. Used in exported processBlockUpload function
async function uploadPart(
  payload: UploadPartPayload,
  signal?: AbortSignal
): Promise<UploadPartResponse> {
  const { fileChunk, part, onUploadProgress } = payload;
  try {
    const response = await axios.put(part.presigned_url, fileChunk, {
      onUploadProgress: onUploadProgress,
      signal,
    });

    return {
      etag: response.headers.etag,
      part_index: part.part_index,
    };
  } catch (error) {
    throw new Error(`Failed to upload part: ${error}`);
  }
}

interface CallRetryEndpointPayload {
  block_id: string;
  failed_parts: UploadPart[];
}
// Do not export. Used in exported processBlockUpload function
async function callRetryEndpoint(
  payload: CallRetryEndpointPayload,
  signal?: AbortSignal
) {
  try {
    const response = await API.post(
      ApiRoutes.files.retryParts,
      {
        block_id: payload.block_id,
        failed_parts: payload.failed_parts,
      },
      {
        signal,
      }
    );

    return response.data?.data as UploadPart[];
  } catch (error) {
    throw new Error(`Failed to refresh parts: ${error}`);
  }
}

interface ProcessBlockUploadPayload {
  block: Blob;
  initialParts: UploadPart[];
  handleProgress: (
    progressEvent: AxiosProgressEvent,
    partIndex: number
  ) => void;
}
export async function processBlockUpload(
  payload: ProcessBlockUploadPayload,
  signal?: AbortSignal
) {
  const { block, initialParts, handleProgress } = payload;
  try {
    // No parts to upload, return early
    if (!initialParts || initialParts.length === 0) return [];

    let partsToUpload = [...initialParts];
    const successfulUploads: UploadPartResponse[] = [];
    let retryCount = 0;

    while (retryCount <= MAX_UPLOAD_RETRIES) {
      // Check if all parts have been uploaded successfully
      if (partsToUpload.length === 0) break;

      const uploadPromises = partsToUpload.map((part) => {
        const start =
          part.part_index === initialParts.length - 1
            ? block.size - part.part_size
            : part.part_index * part.part_size;
        const end = start + part.part_size;
        const chunk = block.slice(start, end);
        return uploadPart(
          {
            fileChunk: chunk,
            part,
            onUploadProgress: (e) => handleProgress(e, part.part_index),
          },
          signal
        );
      });

      const results = await Promise.allSettled(uploadPromises);
      const failedParts: UploadPart[] = [];

      // Process the results of the upload
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          successfulUploads.push(result.value as UploadPartResponse);
        } else {
          const originalPartData = initialParts[index];
          failedParts.push(originalPartData);
        }
      });

      if (failedParts.length === 0) {
        partsToUpload = [];
        break;
      }

      // If failures occurred, check if retries are exhausted
      if (retryCount >= MAX_UPLOAD_RETRIES) {
        const failedIndices = failedParts.map((p) => p.part_index).join(", ");
        throw new Error(
          `Block upload failed for block ${initialParts[0].block_id} after ${
            MAX_UPLOAD_RETRIES + 1
          } attempts. Failed parts: ${failedIndices}`
        );
      }

      // Retry the failed parts

      retryCount++;

      try {
        const refreshedParts = await callRetryEndpoint(
          {
            block_id: initialParts[0].block_id,
            failed_parts: failedParts,
          },
          signal
        );
        partsToUpload = refreshedParts;
      } catch (error) {
        throw new Error(`Failed to refresh parts: ${error}`);
      }
    }

    return successfulUploads.sort((a, b) => a.part_index - b.part_index);
  } catch (error) {
    throw new Error(`At Block Upload: ${error}`);
  }
}

interface UploadPartResponse {
  etag: string;
  part_index: number;
}
interface FinalizeBlockPayload {
  block_key: string;
  encrypted_size: number;
  parts: UploadPartResponse[];
}
export async function finalizeBlock(
  payload: FinalizeBlockPayload,
  signal?: AbortSignal
) {
  try {
    const response = await API.post(
      ApiRoutes.files.finalizeBlock,
      {
        block_key: payload.block_key,
        encrypted_size: payload.encrypted_size,
        parts: payload.parts,
      },
      {
        signal,
      }
    );

    return response.data?.data;
  } catch (error) {
    throw new Error(`Failed to finalize block: ${error}`);
  }
}

export async function finalizeFile(
  { file_id }: { file_id: string },
  signal?: AbortSignal
) {
  try {
    const response = await API.post(
      ApiRoutes.files.finalizeFile,
      {
        file_id,
      },
      {
        signal,
      }
    );

    return response.data?.data;
  } catch (error) {
    throw new Error(`Failed to finalize file: ${error}`);
  }
}
