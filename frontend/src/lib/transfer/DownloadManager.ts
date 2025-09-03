import { devOnly } from "@/utils/dev";
import { DecryptSessionKeyOptions } from "../crypto/workers/crypto";
import { Downloader, FileManifest } from "./Downloader";
import { BlobWriter, ZipWriter } from "@zip.js/zip.js";

export type FileJob = {
  manifest: FileManifest;
  sessionKeyArmored: string;
  fileName: string;
  options: { sessionKeyOptions: DecryptSessionKeyOptions };
};

const CONCURRENCY = 1;

export class DownloadManager {
  private concurrency: number = CONCURRENCY;
  private mode: "direct" | "zip" = "direct";
  private queue: FileJob[] = [];
  private active = 0;
  private blobWriter: BlobWriter | null = null;
  private zipWriter: ZipWriter<Blob> | null = null;

  constructor() {}

  private async writerFactory(mime: string): Promise<{
    writer: WritableStreamDefaultWriter<Uint8Array>;
    blobWriter: BlobWriter;
  }> {
    const blobWriter = new BlobWriter(mime);
    const writer = blobWriter.writable.getWriter();
    return { writer, blobWriter };
  }

  enqueue(job: FileJob) {
    this.queue.push(job);
  }

  async startAll() {
    if (this.queue.length > 1) {
      this.mode = "zip";
      this.zipWriter = new ZipWriter<Blob>(new BlobWriter("application/zip"));
    } else {
      this.mode = "direct";
    }
    return new Promise<Blob>((resolve, reject) => {
      let failed = false;
      const next = async () => {
        if (this.queue.length === 0 && this.active === 0) {
          console.log("All downloads completed");
          if (this.mode === "zip" && this.zipWriter) {
            console.log("Finalizing zip file");
            const blob = await this.zipWriter.close();
            resolve(blob);
          } else if (this.mode === "direct" && this.blobWriter) {
            console.log("Finalizing direct download");
            const blob = await this.blobWriter.getData();
            console.log("Direct download completed. Blob:", blob);
            resolve(blob);
          }
          return;
        }
        while (
          !failed &&
          this.active < this.concurrency &&
          this.queue.length > 0
        ) {
          const job = this.queue.shift()!;
          this.active++;
          this.runJob(job)
            .catch((err) => {
              devOnly(() => {
                console.error("File failed:", job.fileName, err);
              });
              failed = true;
              reject(err);
            })
            .finally(() => {
              this.active--;
              next();
            });
        }
      };
      next();
    });
  }

  private async runJob(job: FileJob) {
    let writer: WritableStreamDefaultWriter<Uint8Array>;
    switch (this.mode) {
      case "direct": {
        const { writer: w, blobWriter } = await this.writerFactory(
          job.manifest.mime
        );
        this.blobWriter = blobWriter;
        writer = w;
        break;
      }
      case "zip": {
        if (!this.zipWriter) {
          throw new Error("ZipWriter not initialized");
        }
        // Create a stream for the zip writer
        const stream = new TransformStream<Uint8Array, Uint8Array>();
        this.zipWriter.add(job.fileName, stream.readable);
        writer = stream.writable.getWriter();
      }
    }
    const downloader = new Downloader(writer);
    await downloader.downloadAndAssemble(
      job.manifest,
      job.sessionKeyArmored,
      job.options
    );

    await writer.close();
  }
}
