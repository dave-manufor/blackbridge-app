import * as openpgp from "openpgp";
import { CryptoBridge } from "@/lib/crypto/workers/CryptoBridge";
import { DecryptSessionKeyOptions } from "../crypto/workers/crypto";
import { devOnly } from "@/utils/dev";
import { ProgressStore } from "./ProgressStore";
import axios from "axios";

export type FileManifest = {
  fileSize: number;
  totalBlocks: number;
  fileId: string;
  mime: string;
  blocks: Array<{
    index: number;
    blockLocator: string;
    plainSha256?: string;
    cipherSha256?: string;
    onBlockProgress?: (bytesDownloaded: number) => void;
  }>;
  signature?: string;
};

const MAX_BATCH = navigator.hardwareConcurrency
  ? Math.min(navigator.hardwareConcurrency, 4)
  : 2;

function hexFromBytes(b: Uint8Array) {
  return Array.from(b)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

export class Downloader {
  private cryptoBridge = CryptoBridge.getInstance();
  private progress = ProgressStore.getInstance();

  constructor(private sinkWriter: WritableStreamDefaultWriter<Uint8Array>) {}

  /**
   * Create an empty bitmap for tracking downloaded chunks.
   * @param totalBlocks Total number of blocks in the manifest.
   * @returns A Uint8Array representing the bitmap.
   *
   * This bitmap will have a length of Math.ceil(totalBlocks / 8) bytes,
   * with each bit representing the download status of a block.
   */
  private makeEmptyBitmap(totalBlocks: number) {
    return new Uint8Array(Math.ceil(totalBlocks / 8));
  }

  /**
   * Mark a block as downloaded in the bitmap.
   * @param bitmap The bitmap to update.
   * @param idx The index of the block to mark.
   *
   * This will set the corresponding bit in the bitmap to indicate the block is downloaded.
   * We find the byte
   */
  private markBit(bitmap: Uint8Array, idx: number) {
    const byte = Math.floor(idx / 8);
    const bit = idx % 8;
    bitmap[byte] |= 1 << bit; // Set bit to 1
  }

  private isBitSet(bitmap: Uint8Array, idx: number) {
    // Find the byte and bit positions
    const byte = Math.floor(idx / 8);
    const bit = idx % 8;
    // Check if the bit is set
    /**
     * This will return true if the bit is set, false otherwise.
     * Start with 00000001 and shift left by the bit position.
     * This will create a mask with a 1 at the bit position.
     * We then use the bitwise AND operator to check if the bit is set.
     */
    return (bitmap[byte] & (1 << bit)) !== 0;
  }

  /**
   * Main entry: download and assemble using manifest and envelope content.
   * - manifest: manifest object
   * - sessionKeyArmored: armored session key(s) string or an envelope locator (if you want to fetch it, call fetch)
   * - options: { sessionKeyOptions: DecryptSessionKeyOptions }
   */
  public async downloadAndAssemble(
    manifest: FileManifest,
    sessionKeyArmored: string,
    options: { sessionKeyOptions: DecryptSessionKeyOptions }
  ) {
    // compute manifestSha for progress storage (Allows us to uniquely identify the download progress since the hash can only be the same for identical manifests)
    const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest));
    const manifestHash = await crypto.subtle.digest("SHA-256", manifestBytes);
    const manifestShaHex = hexFromBytes(new Uint8Array(manifestHash));

    console.log("Session Key Armored:", `${sessionKeyArmored}`);

    try {
      const message = await openpgp.readMessage({
        armoredMessage: sessionKeyArmored,
      });
      console.log("Parsed PGP message:", message);
    } catch (err) {
      console.error("Failed to parse PGP message:", err);
    }

    // 1) Decrypt session key
    const sessionKey = await this.cryptoBridge.decryptSessionKey(
      sessionKeyArmored,
      options.sessionKeyOptions
    );

    console.log("Session key decrypted:", sessionKey);

    // 2) Load resume bitmap
    let bitmap = await this.progress.get(manifestShaHex);
    if (!bitmap) bitmap = this.makeEmptyBitmap(manifest.totalBlocks);

    console.log("Starting download with bitmap:", bitmap);

    // Prepare ordering buffers
    const outOfOrder = new Map<number, Uint8Array>();
    let nextToWrite = 1; // blocks are 1-indexed

    // Helper to flush in-order
    const flushInOrder = async () => {
      while (outOfOrder.has(nextToWrite)) {
        const chunk = outOfOrder.get(nextToWrite)!;
        await this.sinkWriter.write(chunk);
        console.log("Written chunk:", { index: nextToWrite, chunk });
        outOfOrder.delete(nextToWrite);
        this.markBit(bitmap!, nextToWrite);
        nextToWrite++;
      }
    };

    // Build list of indices to fetch
    const todo: number[] = [];
    const MAX_RETRIES = 3;
    const retries = new Map<number, number>();

    for (const block of manifest.blocks)
      if (!this.isBitSet(bitmap!, block.index)) todo.push(block.index);

    // Process in batches to limit calls to pool & network
    while (todo.length) {
      const batch = todo.splice(0, MAX_BATCH);
      // For each index in batch, call decryptChunkAesGcm via a worker from pool
      // We'll map each index to a selected worker to spread load
      const decryptPromises = batch.map(async (index) => {
        // pick worker
        // Fetch block from manifest.blocks[idx].blockLocator
        const block = manifest.blocks.find((b) => b.index === index);
        const url = block?.blockLocator;
        const resp = await axios.get(url!, {
          responseType: "blob",
          validateStatus: () => true, // Don't throw for HTTP errors
          onDownloadProgress: (event) => {
            block?.onBlockProgress?.(event.loaded);
          },
        });
        if (resp.status < 200 || resp.status >= 300)
          throw new Error(`Chunk fetch failed ${resp.status} for ${url}`);
        const blockBlob = new Blob([resp.data]);
        const blockBuffer = new Uint8Array(await blockBlob.arrayBuffer());

        console.log("Fetched block:", {
          index,
          url,
          blockBlob,
          blockBuffer,
        });

        const decryptedBlock = await this.cryptoBridge.decrypt(blockBuffer, {
          sessionKey,
          outputFormat: "binary",
        });

        console.log("Decrypted block:", { index, decryptedBlock });

        // TODO: Implement SHA-256 verification

        return { index, decryptedBlock };
      });

      // settle the promises (if one fails we requeue that index with backoff; for brevity below we do a simple retry strategy)
      const results = await Promise.allSettled(decryptPromises);

      // handle outcomes
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const index = batch[i];
        if (result.status === "fulfilled") {
          const { decryptedBlock } = result.value;
          if (index === nextToWrite) {
            // write directly and flush
            await this.sinkWriter.write(decryptedBlock);
            console.log("Decrypted block written:", { index, decryptedBlock });
            this.markBit(bitmap!, index);
            nextToWrite++;
            await flushInOrder();
          } else {
            outOfOrder.set(index, decryptedBlock);
          }
        } else {
          // on failure: requeue with simple retry: for now push index back into todo's head so it'll be retried
          devOnly(() => {
            console.warn(
              `Chunk ${index} failed decrypt: ${result.reason}. Will retry.`
            );
            console.error(result.reason);
          });
          const retryCount = retries.get(index) || 0;
          if (retryCount < MAX_RETRIES) {
            retries.set(index, retryCount + 1);
            // place back at front of todo for immediate retry
            todo.unshift(index);
            // Exponential backoff
            await new Promise((r) =>
              setTimeout(r, 200 * 2 ** retryCount + 200)
            );
          } else {
            console.error(`Max retries reached for chunk ${index}. Giving up.`);
          }
        }
      }

      // persist progress after batch
      await this.progress.put(manifestShaHex, bitmap!);
    }

    // all chunks processed: flush final
    await flushInOrder();

    // persist final bitmap just in case
    await this.progress.put(manifestShaHex, bitmap!);

    // cleanup
    await this.progress.delete(manifestShaHex);
  }
}
