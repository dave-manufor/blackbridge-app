import {
  getDownloadUrls,
  requestDownload,
} from "@/api/services/transferService";
import { TRANSFER_TYPES } from "@/config/constants/transfers";
import { FileManifest } from "@/lib/transfer/Downloader";
import { DownloadManager, FileJob } from "@/lib/transfer/DownloadManager";
import { useDownloadStore } from "@/stores/downloadStore";
import { devOnly } from "@/utils/dev";
import { saveBlob } from "@/utils/downloads";

const useDownloader = () => {
  const downloadFiles = async (
    config: {
      transfer_identifier: string;
      type: (typeof TRANSFER_TYPES)[keyof typeof TRANSFER_TYPES];
      file_ids: string[];
    } & Pick<FileJob, "sessionKeyArmored" | "options">
  ) => {
    const { createEvent, removeEvent, setBlockProgress } =
      useDownloadStore.getState();
    const mode = config.file_ids.length > 1 ? "zip" : "direct";
    const manager = new DownloadManager();
    const { transfer, token } = await requestDownload(
      config.transfer_identifier,
      config.type
    );

    const filesToDownload = transfer.files.filter((file) =>
      config.file_ids.includes(file.id)
    );

    if (filesToDownload.length < 1) {
      devOnly(() => console.warn("No files to download"));
      return;
    }

    const totalBytes = filesToDownload.reduce(
      (acc, file) => acc + file.size,
      0
    );

    const eventName =
      mode === "zip"
        ? `Zipping ${filesToDownload.length} file${
            filesToDownload.length > 1 ? "s" : ""
          }`
        : filesToDownload[0]?.name || "Downloading File";
    const transferEventId = createEvent(eventName, mode, totalBytes);

    for (const file of filesToDownload) {
      const presignedUrls = await getDownloadUrls(file.id, token);

      const manifest: FileManifest = {
        fileSize: file.size,
        mime: file.content_type,
        totalBlocks: file.blocks.length,
        fileId: file.id,
        blocks: presignedUrls.map((block) => ({
          index: block.block_index,
          blockLocator: block.download_url,
          onBlockProgress: (bytesDownloaded: number) => {
            if (!transferEventId) return;
            setBlockProgress(
              transferEventId,
              file.id,
              block.block_index,
              bytesDownloaded
            );
          },
        })),
      };

      devOnly(() => console.log("Enqueuing download job for:", file.name));
      const job: FileJob = {
        manifest,
        fileName: file.name,
        sessionKeyArmored: config.sessionKeyArmored,
        options: config.options,
      };
      manager.enqueue(job);
    }

    devOnly(() => console.log("Starting download for:", filesToDownload));
    try {
      const blob = await manager.startAll();

      console.log("Download completed, got blob:", blob);

      const details = {
        fileName: mode === "zip" ? "Archive.zip" : filesToDownload[0]?.name,
        mimeType:
          mode === "zip" ? "application/zip" : filesToDownload[0]?.content_type,
      };

      saveBlob(blob, details.fileName, details.mimeType);

      // Event is removed in download drawer component with timeout
    } catch (error) {
      devOnly(() => {
        console.error("Download failed:", error);
      });
      removeEvent(transferEventId);
    }
  };

  return { downloadFiles };
};

export default useDownloader;
