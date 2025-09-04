import * as streamSaver from "streamsaver";
import { WritableWriter, ZipWriter } from "@zip.js/zip.js";
import { devOnly } from "@/utils/dev";
import { DecryptSessionKeyOptions } from "../crypto/workers/crypto";
import { Downloader, FileManifest } from "./Downloader";

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
  private usedNames: Record<string, number> = {};
  private active = 0;

  // streaming writers
  private fileWriter: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private zipWriter: ZipWriter<WritableWriter> | null = null;

  constructor() {}

  enqueue(job: FileJob) {
    this.queue.push(job);
  }

  async startAll() {
    if (this.queue.length > 1) {
      this.mode = "zip";
      // Stream the final zip file using streamSaver
      const zipName = "Archive.zip";
      devOnly(() => console.log("Opening zip download stream:", zipName));

      const fileStream = streamSaver.createWriteStream(zipName);
      this.zipWriter = new ZipWriter(fileStream);
    } else {
      this.mode = "direct";
    }

    return new Promise<void>((resolve, reject) => {
      let failed = false;

      const next = async () => {
        if (this.queue.length === 0 && this.active === 0) {
          devOnly(() => console.log("All downloads completed"));

          try {
            if (this.mode === "zip" && this.zipWriter) {
              devOnly(() => console.log("Finalizing zip file"));
              await this.zipWriter.close(); // writes central directory
            }
          } catch (err) {
            devOnly(() => console.error("Error finalizing zipWriter:", err));
            // still try to close fileWriter below
          }

          try {
            if (this.fileWriter) {
              devOnly(() => console.log("Closing file writer"));
              await this.fileWriter.close();
            }
            // if direct mode we close inside runJob after all is done
          } catch (err) {
            devOnly(() => console.error("Error closing file writer:", err));
          }

          resolve();
          return;
        }

        while (
          !failed &&
          this.active < this.concurrency &&
          this.queue.length > 0
        ) {
          devOnly(() => console.log("Starting next download job"));
          const job = this.queue.shift()!;
          this.active++;
          this.runJob(job)
            .catch((err) => {
              devOnly(() => {
                console.error("File failed:", job.fileName, err);
              });
              this.fileWriter?.abort(err);
              this.zipWriter?.close();
              failed = true;
              reject(err);
            })
            .finally(() => {
              devOnly(() =>
                console.log("Download job finished:", job.fileName)
              );
              this.active--;
              next();
            });
        }
      };

      next();
    });
  }

  private async runJob(job: FileJob) {
    devOnly(() => console.log("Running job:", job.fileName, this.mode));
    let writer: WritableStreamDefaultWriter<Uint8Array>;

    switch (this.mode) {
      case "direct": {
        devOnly(() =>
          console.log("Starting direct download for:", job.fileName)
        );
        // Stream a single file directly to disk
        const fileStream = streamSaver.createWriteStream(job.fileName, {
          size: job.manifest.fileSize,
        });
        const fileWriter = fileStream.getWriter();
        writer = fileWriter;
        // Downloader will write to this writer and close it after
        break;
      }
      case "zip": {
        devOnly(() => console.log("Adding file to zip:", job.fileName));
        if (!this.zipWriter) {
          throw new Error("ZipWriter not initialized");
        }
        // Ensure unique file names in the zip
        let counter = this.usedNames[job.fileName] || 0;
        let uniqueName = job.fileName;
        const extensionMatch = job.fileName.match(/(\.[^.]+)$/);
        const extension = extensionMatch ? extensionMatch[1] : "";
        const baseName = extension
          ? job.fileName.slice(0, -extension.length)
          : job.fileName;
        while (this.usedNames[uniqueName]) {
          uniqueName = `${baseName}(${++counter})${extension}`;
        }
        this.usedNames[uniqueName] = counter + 1;

        // Each file gets its own stream inside the zip
        const stream = new TransformStream<Uint8Array, Uint8Array>();
        // zip.js accepts readable streams as entries
        this.zipWriter.add(uniqueName, stream.readable).catch((err) => {
          throw new Error("Error adding file to zip: " + err);
        });
        writer = stream.writable.getWriter();
        break;
      }
    }
    devOnly(() => console.log("Writer initialized for job:", job.fileName));

    // Stream decrypted chunks into the writer
    const downloader = new Downloader(writer);
    await downloader.downloadAndAssemble(
      job.manifest,
      job.sessionKeyArmored,
      job.options
    );

    // close the writer for this entry (direct file or zip entry stream)
    await writer.close();

    // In direct mode, file writer close is done here (closing the file download)
    if (this.mode === "direct") {
      devOnly(() =>
        console.log(
          "Direct file finished, file writer closed by writer.close()"
        )
      );
    }
  }
}
