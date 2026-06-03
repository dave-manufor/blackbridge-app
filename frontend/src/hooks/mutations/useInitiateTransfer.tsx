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
  initiateRequestFulfillment,
  commitRequestFulfillment,
  CommitRequestFulfillmentPayload,
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

const transfer = async (
  payload: InitiateTransferPayload,
  signal: AbortSignal
) => {
  const { data, request_id } = payload;
  const { files } = data;
  uploadStore.initializeUpload(files);

  // 1. Initialize transfer
  devOnly(() => {
    console.log("Initializing transfer...");
  });

  const transferId = request_id
    ? await initiateRequestFulfillment(
        {
          request_id,
          duration: TRANSFER_DURATIONS[data.duration],
        },
        signal
      )
    : await initializeTransfer(
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

    let previousEnd = 0;
    const blockProcessingTask = blocks
      .sort((a, b) => a.index - b.index)
      .map((block) => async () => {
        uploadStore.initializeBlockProgressMap(i, block.index);
        const start = previousEnd;
        const end = start + block.size;
        previousEnd = end;
        const fileChunk = new Uint8Array(
          await file.slice(start, end).arrayBuffer()
        );

        const encryptedChunk = await cryptoBridge.encrypt(fileChunk, {
          sessionKey,
          outputFormat: "binary",
        });

        const parts = await announceUpload({ block_id: block.id }, signal);

        parts.forEach((part) => {
          uploadStore.setPartProgress(i, block.index, part.part_index, 0);
        });

        const safeBuffer = encryptedChunk.data.slice().buffer;

        const uploadedParts = await processBlockUpload(
          {
            block: new Blob([safeBuffer]),
            initialParts: parts,
            handleProgress: (e: AxiosProgressEvent, partIndex: number) => {
              const partOriginalSize =
                parts.find((p) => p.part_index === partIndex)?.part_size ?? 0;
              if (!e.total || partOriginalSize === 0) return;

              const progressRatio = e.loaded / e.total;
              const loadedForThisPartOriginal =
                partOriginalSize * progressRatio;

              uploadStore.setPartProgress(
                i,
                block.index,
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

  if (request_id) {
    // Fulfillment flow
    const recipients = await getPublicKeys(data.recipients as string[], signal);
    const requester = recipients[0];
    if (!requester || !requester.public_key) {
      throw new Error("Requester public key not found.");
    }
    const requester_key = (
      await cryptoBridge.encryptSessionKeys(sessionKey, {
        publicKeys: [requester.public_key],
        outputFormat: "armored",
      })
    )[0];

    const commitPayload: CommitRequestFulfillmentPayload = {
      request_id,
      owner_key: encryptedOwnerKey,
      requester_key,
    };
    await commitRequestFulfillment(commitPayload, signal);
  } else {
    // Normal transfer flow
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
      const fragment = await cryptoBridge.generateRandomFragment(16);
      passphrase += fragment;
      if (data.isPasswordProtected && data.password) {
        passphrase += data.password;
      }

      const encryptedLinkKey = (
        await cryptoBridge.encryptSessionKeys(sessionKey, {
          passphrase: passphrase,
          outputFormat: "armored",
        })
      )[0];
      const encryptedFragment = await cryptoBridge.encryptFragment(
        fragment,
        ownerPublicKey
      );
      commitPayload.link_key = encryptedLinkKey;
      commitPayload.fragment = encryptedFragment;
    } else if (!data.isLink) {
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
  }

  return transferId;
};

interface InitiateTransferPayload {
  data: z.infer<typeof transferSchema>;
  request_id?: string;
}

const useInitiateTransfer = () => {
  const queryClient = useQueryClient();
  const controller = new AbortController();
  return useMutation({
    mutationFn: async (payload: InitiateTransferPayload) => {
      return await transfer(payload, controller.signal);
    },
    onSuccess: (transferId, variables) => {
      uploadStore.setStatus("success");
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all });
      if (variables.request_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.fileRequests.detail(variables.request_id),
        });
      }
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
