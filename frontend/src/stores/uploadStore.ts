import { isDevEnvironment } from "@/utils/dev";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

type UploadStatus = "idle" | "uploading" | "success" | "error";

interface FileProgress {
  size: number;
  loadedBytes: number;
  // Map<blockIndex, Map<partIndex, loadedBytes>>
  blocksMap: Map<number, Map<number, number>>;
}

interface UploadState {
  status: UploadStatus;
  // Map<fileIndex, Map<blockIndex, Map<partIndex, loadedBytes>>>
  progressMap: Map<number, FileProgress>;
  // Calculated progress for the UI
  totalProgress: number; // Overall progress (0-100)
  fileProgress: number[]; // Progress per file (0-100)
  // Raw byte counts for accurate calculations
  totalUploadSize: number;
  totalUploaded: number;
}

interface UploadActions {
  setStatus: (status: UploadStatus) => void;
  initializeUpload: (files: File[]) => void;
  initializeFileProgressMap: (fileIndex: number, fileSize: number) => void;
  initializeBlockProgressMap: (fileIndex: number, blockIndex: number) => void;
  setPartProgress: (
    fileIndex: number,
    blockIndex: number,
    partIndex: number,
    loadedBytes: number
  ) => void;
}

const initialState: UploadState = {
  status: "idle",
  progressMap: new Map(),
  totalProgress: 0,
  fileProgress: [],
  totalUploadSize: 0,
  totalUploaded: 0,
};

export const useUploadStore = create<UploadState & UploadActions>()(
  devtools(
    (set, get) => ({
      ...initialState,
      setStatus: (status: UploadStatus) => {
        set({
          status: status,
        });
      },
      initializeUpload: (files: File[]) => {
        if (get().status === "uploading") {
          console.warn("Upload is already in progress.");
          return;
        }

        if (files.length === 0) {
          console.warn("No files to upload.");
          return;
        }

        // 1. Reset state and set status to "uploading"
        const totalUploadSize = files.reduce((acc, file) => acc + file.size, 0);
        set({
          status: "uploading",
          totalProgress: 0,
          totalUploaded: 0,
          totalUploadSize,
          progressMap: new Map(),
          fileProgress: Array(files.length).fill(0),
        });
      },
      initializeFileProgressMap: (fileIndex: number, fileSize: number) => {
        const { progressMap } = get();
        progressMap.set(fileIndex, {
          size: fileSize,
          loadedBytes: 0,
          blocksMap: new Map(),
        });
        set({
          progressMap: new Map(progressMap),
        });
      },
      initializeBlockProgressMap: (fileIndex: number, blockIndex: number) => {
        const { progressMap } = get();
        progressMap.get(fileIndex)?.blocksMap.set(blockIndex, new Map());
        set({
          progressMap: new Map(progressMap),
        });
      },
      setPartProgress: (
        fileIndex: number,
        blockIndex: number,
        partIndex: number,
        progress: number
      ) => {
        const { progressMap, totalUploaded, totalUploadSize, fileProgress } =
          get();
        // Get the previously loaded amount for this specific part
        const previousProgress =
          progressMap
            .get(fileIndex)
            ?.blocksMap.get(blockIndex)
            ?.get(partIndex) || 0;

        // Calculate the change (delta)
        const delta = progress - previousProgress;

        // Update the running totals
        const newTotal = totalUploaded + delta;
        const newProgress = (newTotal / totalUploadSize) * 100;
        const fileProgressObj = progressMap.get(fileIndex);
        if (fileProgressObj) {
          fileProgressObj.loadedBytes += delta;
          fileProgress[fileIndex] =
            (fileProgressObj.loadedBytes / fileProgressObj.size) * 100;
        }

        // Update the state map with the new loaded value
        progressMap
          .get(fileIndex)
          ?.blocksMap.get(blockIndex)
          ?.set(partIndex, progress);
        set({
          progressMap: new Map(progressMap),
          totalUploaded: newTotal,
          totalProgress: newProgress,
          fileProgress: [...fileProgress],
        });
      },
    }),
    {
      name: "upload-store",
      enabled: isDevEnvironment(),
    }
  )
);
