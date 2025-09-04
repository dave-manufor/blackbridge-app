import { CryptoBridge } from "@/lib/crypto/workers/CryptoBridge";
import { DecryptSessionKeyOptions } from "../crypto/workers/crypto";
import { devOnly } from "@/utils/dev";
import { ProgressStore } from "./ProgressStore";

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

// Limit concurrency to 2 to reduce resource usage and avoid overwhelming the streaming implementation.
// This helps prevent excessive simultaneous fetches and memory usage, especially on devices with many CPU cores.
const MAX_BATCH = navigator.hardwareConcurrency
  ? Math.min(navigator.hardwareConcurrency, 2)
  : 2;

function hexFromBytes(b: Uint8Array) {
  return Array.from(b)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

function concatUint8Arrays(chunks: Uint8Array[]) {
  const total = chunks.reduce((acc, c) => acc + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

export class Downloader {
  private cryptoBridge = CryptoBridge.getInstance();
  private progress = ProgressStore.getInstance();

  constructor(private sinkWriter: WritableStreamDefaultWriter<Uint8Array>) {}

  private makeEmptyBitmap(totalBlocks: number) {
    return new Uint8Array(Math.ceil(totalBlocks / 8));
  }

  private markBit(bitmap: Uint8Array, idx: number) {
    const byte = Math.floor(idx / 8);
    const bit = idx % 8;
    bitmap[byte] |= 1 << bit;
  }

  private isBitSet(bitmap: Uint8Array, idx: number) {
    const byte = Math.floor(idx / 8);
    const bit = idx % 8;
    return (bitmap[byte] & (1 << bit)) !== 0;
  }

  public async downloadAndAssemble(
    manifest: FileManifest,
    sessionKeyArmored: string,
    options: { sessionKeyOptions: DecryptSessionKeyOptions }
  ) {
    devOnly(() => console.log("Starting download for manifest:", manifest));
    const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest));
    const manifestHash = await crypto.subtle.digest("SHA-256", manifestBytes);
    const manifestShaHex = hexFromBytes(new Uint8Array(manifestHash));

    // Decrypt session key
    const sessionKey = await this.cryptoBridge.decryptSessionKey(
      sessionKeyArmored,
      options.sessionKeyOptions
    );

    devOnly(() => console.log("Session key decrypted"));

    // Load resume bitmap
    let bitmap = await this.progress.get(manifestShaHex);
    if (!bitmap) bitmap = this.makeEmptyBitmap(manifest.totalBlocks);

    devOnly(() => console.log("Starting download with bitmap:", bitmap));

    // Detect whether blocks are 0-indexed or 1-indexed
    const minIndex = manifest.blocks.reduce(
      (min, b) => (b.index < min ? b.index : min),
      manifest.blocks.length ? manifest.blocks[0].index : 0
    );
    let nextToWrite = minIndex === 0 ? 0 : 1;

    const outOfOrder = new Map<number, Uint8Array>();

    const flushInOrder = async () => {
      while (outOfOrder.has(nextToWrite)) {
        const chunk = outOfOrder.get(nextToWrite)!;
        await this.sinkWriter.write(chunk);
        devOnly(() => console.log("Written chunk:", { index: nextToWrite }));
        outOfOrder.delete(nextToWrite);
        this.markBit(bitmap!, nextToWrite);
        nextToWrite++;
      }
    };

    // Prepare todo list (only indices missing in bitmap)
    const todo: number[] = [];
    for (const block of manifest.blocks) {
      if (!this.isBitSet(bitmap!, block.index)) todo.push(block.index);
    }

    const MAX_RETRIES = 3;
    const retries = new Map<number, number>();

    while (todo.length) {
      const batch = todo.splice(0, MAX_BATCH);

      const decryptPromises = batch.map(async (index) => {
        const block = manifest.blocks.find((b) => b.index === index);
        if (!block)
          throw new Error("Block metadata missing for index " + index);
        const url = block.blockLocator;

        // Use fetch to stream and report progress
        const resp = await fetch(url);
        if (!resp.ok)
          throw new Error(`Chunk fetch failed ${resp.status} for ${url}`);
        if (!resp.body) {
          // fallback: if no streaming body, read as arrayBuffer
          const buf = new Uint8Array(await resp.arrayBuffer());
          block.onBlockProgress?.(buf.length);
          const decryptedBlock = await this.cryptoBridge.decrypt(buf, {
            sessionKey,
            outputFormat: "binary",
          });
          return { index, decryptedBlock };
        }

        const reader = resp.body.getReader();
        const chunks: Uint8Array[] = [];
        let downloaded = 0;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk =
              value instanceof Uint8Array ? value : new Uint8Array(value);
            chunks.push(chunk);
            downloaded += chunk.length;
            block.onBlockProgress?.(downloaded);
          }
        } finally {
          reader.releaseLock();
        }

        const blockBuffer = concatUint8Arrays(chunks);

        // Decrypt (your cryptoBridge expects a Uint8Array)
        const decryptedBlock = await this.cryptoBridge.decrypt(blockBuffer, {
          sessionKey,
          outputFormat: "binary",
        });

        // TODO: verify SHA256 if provided (plainSha256/cipherSha256)

        return { index, decryptedBlock };
      });

      const results = await Promise.allSettled(decryptPromises);

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const index = batch[i];
        if (result.status === "fulfilled") {
          const { decryptedBlock } = result.value;
          if (index === nextToWrite) {
            await this.sinkWriter.write(decryptedBlock);
            devOnly(() => console.log("Decrypted block written:", { index }));
            this.markBit(bitmap!, index);
            nextToWrite++;
            await flushInOrder();
          } else {
            outOfOrder.set(index, decryptedBlock);
          }
        } else {
          devOnly(() => console.warn(`Chunk ${index} failed:`, result.reason));
          const retryCount = retries.get(index) || 0;
          if (retryCount < MAX_RETRIES) {
            retries.set(index, retryCount + 1);
            // put back at front of todo for retry
            todo.unshift(index);
            // simple backoff
            await new Promise((r) =>
              setTimeout(r, 200 * 2 ** retryCount + 200)
            );
          } else {
            throw new Error(
              `Max retries reached for chunk ${index}: ${result.reason}`
            );
          }
        }
      }

      // persist progress after batch
      await this.progress.put(manifestShaHex, bitmap!);
    }

    // flush any remaining
    await flushInOrder();

    // persist final bitmap & cleanup
    await this.progress.put(manifestShaHex, bitmap!);
    await this.progress.delete(manifestShaHex);
  }
}
