import {
  getDownloadUrls,
  requestDownload,
} from "@/api/services/transferService";
import { TRANSFER_TYPES } from "@/config/constants/transfers";
import { FileManifest } from "@/lib/transfer/Downloader";
import { DownloadManager, FileJob } from "@/lib/transfer/DownloadManager";
import { useDownloadStore } from "@/stores/downloadStore";
import { devOnly } from "@/utils/dev";

const useDownloader = () => {
  const downloadFiles = async (
    config: {
      transfer_identifier: string;
      type: (typeof TRANSFER_TYPES)[keyof typeof TRANSFER_TYPES];
      file_ids: string[];
    } & Pick<FileJob, "sessionKeyArmored" | "options">
  ) => {
    const { createEvent, removeEvent, setEventError, setBlockProgress } =
      useDownloadStore.getState();
    const mode = config.file_ids.length > 1 ? "zip" : "direct";
    const manager = new DownloadManager();
    let transferEventId: string | null = null;
    try {
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
      transferEventId = createEvent(eventName, mode, totalBytes);

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

      await manager.startAll();
    } catch (error) {
      devOnly(() => {
        console.error("Download failed:", error);
      });
      if (transferEventId) {
        setEventError(transferEventId, true);
      }
    } finally {
      setTimeout(() => {
        if (transferEventId) {
          removeEvent(transferEventId);
        }
      }, 5000);
    }
  };

  return { downloadFiles };
};

export default useDownloader;
