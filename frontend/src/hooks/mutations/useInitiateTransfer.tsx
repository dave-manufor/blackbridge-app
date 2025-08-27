import { AxiosProgressEvent } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { transferSchema } from "@/lib/validators";
import { TRANSFER_DURATIONS } from "@/config/constants/transfers";
import { CryptoBridge } from "@/lib/crypto/workers/CryptoBridge";
import {
  commitTransfer,
  CommitTransferPayload,
  initializeTransfer,
} from "@/api/services/transferService";
import {
  announceUpload,
  finalizeBlock,
  finalizeFile,
  processBlockUpload,
  requestUpload,
} from "@/api/services/fileService";
import { useAuthStore } from "@/stores/authStore";
import { getPublicKeys } from "@/api/services/userService";
import { devOnly } from "@/utils/dev";
import { useUploadStore } from "@/stores/uploadStore";
import { runInParallel } from "@/utils/concurrency";
import { queryKeys } from "../queries";

const cryptoBridge = CryptoBridge.getInstance();
const uploadStore = useUploadStore.getState();

const CONCURRENCY_LIMIT = 2;

/**
 * Main transfer orchestration function.
 * Handles the entire E2EE transfer process.
 */
const transfer = async (
  payload: { data: z.infer<typeof transferSchema> },
  signal: AbortSignal
) => {
  const { data } = payload;
  const { files } = data;
  uploadStore.initializeUpload(files);

  // 1. Initialize transfer to get a transferId
  devOnly(() => {
    console.log("Initializing transfer...");
  });
  const transferId = await initializeTransfer(
    data.isLink
      ? {
          title: data.title,
          description: data.description,
          duration: TRANSFER_DURATIONS[data.duration],
          isLink: true,
          is_password_protected: data.isPasswordProtected,
          access_control: data.access_control,
        }
      : {
          title: data.title,
          description: data.description,
          duration: TRANSFER_DURATIONS[data.duration],
          isLink: false,
          recipients: data.recipients as string[],
        },
    signal
  );

  // 2. Generate a single session key for the entire transfer
  devOnly(() => {
    console.log("Transfer ID:", transferId);
    console.log("Generating session key...");
  });
  const sessionKey = await cryptoBridge.generateSessionKey();

  // 3. Process each file: encrypt and upload
  devOnly(() => {
    console.log("Processing files...");
  });
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    // Initialize file-specific progress and state
    uploadStore.initializeFileProgressMap(i, file.size);

    const { file_id, blocks } = await requestUpload(
      {
        transfer_id: transferId,
        name: file.name,
        content_type: file.type,
        size: file.size,
      },
      signal
    );

    // Create an array of block processing thunks
    const blockProcessingTask = blocks.map((block, j) => async () => {
      // Initialize block-specific state
      uploadStore.initializeBlockProgressMap(i, j);
      const start = j * block.size;
      const end = start + block.size;
      const fileChunk = new Uint8Array(
        await file.slice(start, end).arrayBuffer()
      );

      // Encrypt the chunk before uploading
      const encryptedChunk = await cryptoBridge.encrypt(fileChunk, {
        sessionKey,
        outputFormat: "binary",
      });

      const parts = await announceUpload({ block_id: block.id }, signal);

      // Pre-populate parts with 0 loaded bytes
      parts.forEach((part) => {
        uploadStore.setPartProgress(i, j, part.part_index, 0);
      });

      // Guarantees it's a Blob-safe buffer
      const safeBuffer = encryptedChunk.data.slice().buffer;

      const uploadedParts = await processBlockUpload(
        {
          block: new Blob([safeBuffer]),
          initialParts: parts,
          handleProgress: (e: AxiosProgressEvent, partIndex: number) => {
            // This progress is for the encrypted chunk, so we map it back to original file size for UI
            const partOriginalSize =
              parts.find((p) => p.part_index === partIndex)?.part_size ?? 0;
            if (!e.total || partOriginalSize === 0) return;

            // Map encrypted progress back to the original unencrypted part size
            const progressRatio = e.loaded / e.total;
            const loadedForThisPartOriginal = partOriginalSize * progressRatio;

            uploadStore.setPartProgress(
              i,
              j,
              partIndex,
              loadedForThisPartOriginal
            );
          },
        },
        signal
      );

      await finalizeBlock(
        {
          block_key: block.path,
          encrypted_size: encryptedChunk.data.byteLength,
          parts: uploadedParts,
        },
        signal
      );
    });

    // Execute all block tasks for the current file in parallel with a limit.
    await runInParallel(blockProcessingTask, CONCURRENCY_LIMIT);

    await finalizeFile({ file_id }, signal);
  }

  // 4. Encrypt session key for all parties and commit the transfer

  const ownerPublicKey = useAuthStore.getState().primaryKeys?.public_key;
  if (!ownerPublicKey)
    throw new Error("Primary public key not found for user.");

  const encryptedOwnerKey = (
    await cryptoBridge.encryptSessionKeys(sessionKey, {
      publicKeys: [ownerPublicKey],
      outputFormat: "armored",
    })
  )[0];

  const commitPayload: {
    transfer_id: string;
    isLink: boolean;
    owner_key: string;
    recipient_keys?: { email: string; file_key: string }[];
    link_key?: string;
    fragment?: string;
  } = {
    transfer_id: transferId,
    isLink: data.isLink,
    owner_key: encryptedOwnerKey,
  };

  if (data.isLink) {
    devOnly(() => {
      console.log("Link-based key encryption initiated");
    });
    let passphrase = "";
    // Generate fragment
    const fragment = await cryptoBridge.generateRandomFragment(16);
    passphrase += fragment;
    // If if password protected, concatenate fragment with password
    if (data.isPasswordProtected && data.password) {
      passphrase += data.password;
    }

    // Encrypt link key
    const encryptedLinkKey = (
      await cryptoBridge.encryptSessionKeys(sessionKey, {
        passphrase: passphrase,
        outputFormat: "armored",
      })
    )[0];
    // Encrypt fragment
    const encryptedFragment = await cryptoBridge.encryptFragment(
      fragment,
      ownerPublicKey
    );
    commitPayload.link_key = encryptedLinkKey;
    commitPayload.fragment = encryptedFragment;
  } else if (!data.isLink) {
    // Email-based transfer
    devOnly(() => {
      console.log("Email-based key encryption initiated");
    });
    const recipients = await getPublicKeys(data.recipients as string[], signal);
    const validRecipients = recipients.filter(
      (recipient) => recipient.public_key
    );
    commitPayload.recipient_keys = await Promise.all(
      validRecipients.map(async (recipient) => ({
        email: recipient.email,
        file_key: (
          await cryptoBridge.encryptSessionKeys(sessionKey, {
            publicKeys: [recipient.public_key],
            outputFormat: "armored",
          })
        )[0],
      }))
    );
  }

  await commitTransfer(commitPayload as CommitTransferPayload, signal);
};

interface InitiateTransferPayload {
  data: z.infer<typeof transferSchema>;
}

const useInitiateTransfer = () => {
  const queryClient = useQueryClient();
  const controller = new AbortController();
  return useMutation({
    mutationFn: (payload: InitiateTransferPayload) =>
      transfer(
        {
          data: payload.data,
        },
        controller.signal
      ),
    onSuccess: () => {
      uploadStore.setStatus("success");
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all });
    },
    onError: (error) => {
      controller.abort();
      uploadStore.setStatus("error");
      devOnly(() => {
        console.error("Error during transfer:", error);
      });
    },
  });
};

export default useInitiateTransfer;
