import { CryptoBridge } from "@/lib/crypto/workers/CryptoBridge";
import { DecryptSessionKeyOptions } from "../crypto/workers/crypto";
import { devOnly } from "@/utils/dev";
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

export class Downloader {
  private cryptoBridge = CryptoBridge.getInstance();

  constructor(private sink: WritableStream<Uint8Array>) {}

  public async downloadAndAssemble(
    manifest: FileManifest,
    sessionKeyArmored: string,
    options: { sessionKeyOptions: DecryptSessionKeyOptions }
  ) {
    devOnly(() => console.log("Starting download for manifest:", manifest));

    // Decrypt session key
    const sessionKey = await this.cryptoBridge.decryptSessionKey(
      sessionKeyArmored,
      options.sessionKeyOptions
    );

    devOnly(() => console.log("Session key decrypted"));

    // Prepare todo list (only indices missing in bitmap)
    const todo: number[] = manifest.blocks
      .sort((a, b) => a.index - b.index)
      .map((b) => b.index);

    // const MAX_RETRIES = 3;
    // const retries = new Map<number, number>();

    while (todo.length) {
      // const batch = todo.splice(0, MAX_BATCH);
      const [index] = todo.splice(0, 1);
      const block = manifest.blocks.find((b) => b.index === index);
      if (!block) throw new Error("Block metadata missing for index " + index);
      const url = block.blockLocator;

      // 1. Get block as stream
      const resp = await axios.get<ReadableStream<Uint8Array<ArrayBuffer>>>(
        url,
        {
          adapter: "fetch",
          responseType: "stream",
          onDownloadProgress: (progressEvent) => {
            if (progressEvent.loaded) {
              block.onBlockProgress?.(progressEvent.loaded);
            }
          },
        }
      );

      if (resp.status !== 200)
        throw new Error(`Chunk fetch failed ${resp.status} for ${url}`);
      if (!resp.data)
        throw new Error(`No data in response when fetching chunk ${url}`);

      console.log("Response data:", resp.data);

      const [monitorStream, encryptedStream] = resp.data.tee();
      // Consume one branch to monitor progress
      (async () => {
        const reader = monitorStream.getReader();
        let downloaded = 0;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk =
              value instanceof Uint8Array ? value : new Uint8Array(value);
            downloaded += chunk.length;
            // console.log("Downloaded chunk size:", chunk.length, downloaded);
            block.onBlockProgress?.(downloaded);
          }
        } catch (e) {
          devOnly(() => console.warn("Error reading stream for progress:", e));
        } finally {
          reader.releaseLock();
        }
      })();

      // 3. Decrypt stream using cryptoBridge
      const decryptedStream = await this.cryptoBridge.decryptBinaryAsStream(
        encryptedStream,
        {
          sessionKey,
        }
      );

      try {
        await decryptedStream.pipeTo(this.sink, { preventClose: true });
        devOnly(() => console.log("Decrypted block written:", { index }));
        // this.markBit(bitmap!, index);
      } catch (error) {
        devOnly(() => console.error("Error piping decrypted stream:", error));
        throw error;
      }

      // TODO: verify SHA256 if provided (plainSha256/cipherSha256)
    }
  }
}
