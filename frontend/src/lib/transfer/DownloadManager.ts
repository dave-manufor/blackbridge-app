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

export class DownloadManager {
  private concurrency: number;
  private mode: "direct" | "zip";
  private queue: FileJob[] = [];
  private active = 0;
  private zipWriter: ZipWriter<Blob> | null = null;

  constructor(opts?: { mode: "direct" | "zip"; concurrency?: number }) {
    this.concurrency = opts?.concurrency ?? 1; // default: 1 file at once
    this.mode = opts?.mode ?? "direct"; // default: 'direct'
  }

  private async writerFactory(
    fileName: string
  ): Promise<WritableStreamDefaultWriter<Uint8Array>> {
    const handle = await window.showSaveFilePicker({
      suggestedName: fileName,
    });
    const writable = await handle.createWritable();
    return writable.getWriter();
  }

  enqueue(job: FileJob) {
    this.queue.push(job);
  }

  async startAll() {
    if (this.mode === "zip") {
      this.zipWriter = new ZipWriter<Blob>(new BlobWriter("application/zip"));
    }
    return new Promise<Blob | void>((resolve, reject) => {
      const next = async () => {
        if (this.queue.length === 0 && this.active === 0) {
          if (this.mode === "zip" && this.zipWriter) {
            const blob = await this.zipWriter.close();
            resolve(blob);
          } else {
            resolve();
          }
          return;
        }
        while (this.active < this.concurrency && this.queue.length > 0) {
          const job = this.queue.shift()!;
          this.active++;
          this.runJob(job)
            .catch((err) => {
              devOnly(() => {
                console.error("File failed:", job.fileName, err);
              });
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
      case "direct":
        writer = await this.writerFactory(job.fileName);
        break;
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
