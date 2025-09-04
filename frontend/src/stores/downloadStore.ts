import { isDevEnvironment } from "@/utils/dev";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface DownloadEvent {
  id: string;
  name: string;
  mode: "direct" | "zip";
  totalBytes: number;
  hasError: boolean;
  progressMap: Map<string, Map<number, number>>; // fileId -> (blockIndex -> bytesDownloaded)
}

interface DownloadState {
  events: Map<string, DownloadEvent>;
  createEvent: (
    name: string,
    mode: DownloadEvent["mode"],
    totalBytes: number
  ) => string;
  setEventError: (id: string, hasError: boolean) => void;
  removeEvent: (id: string) => void;
  setBlockProgress: (
    id: string,
    fileId: string,
    blockIndex: number,
    bytesDownloaded: number
  ) => void;
  getEventProgress: (id: string) => number;
}

export const useDownloadStore = create<DownloadState>()(
  devtools(
    (set, get) => ({
      events: new Map(),
      createEvent: (name, mode, totalBytes) => {
        const id = crypto.randomUUID();
        const newEvent: DownloadEvent = {
          id,
          name,
          mode,
          totalBytes,
          hasError: false,
          progressMap: new Map(),
        };
        set((state) => ({ events: new Map(state.events).set(id, newEvent) }));
        return id;
      },

      setEventError: (id, hasError) => {
        set((state) => {
          const event = state.events.get(id);
          if (!event) return state;

          event.hasError = hasError;
          return { events: new Map(state.events).set(id, event) };
        });
      },

      removeEvent: (id) =>
        set((state) => {
          state.events.delete(id);
          return { events: new Map(state.events) };
        }),
      setBlockProgress: (id, fileIndex, blockIndex, bytesDownloaded) => {
        set((state) => {
          const event = state.events.get(id);
          if (!event) return state;

          const previousDownloaded =
            event.progressMap.get(fileIndex)?.get(blockIndex) || 0;
          const delta = bytesDownloaded - previousDownloaded;
          if (delta <= 0) return state; // No progress made or failed part retry

          const fileMap = event.progressMap.get(fileIndex) || new Map();
          fileMap.set(blockIndex, bytesDownloaded);
          event.progressMap.set(fileIndex, fileMap);

          return { events: new Map(state.events).set(id, event) };
        });
      },
      // Returns Percentage
      getEventProgress: (id) => {
        const event = get().events.get(id);
        if (!event) return 0;
        let totalDownloaded = 0;
        event.progressMap.forEach((fileMap) => {
          fileMap.forEach((bytes) => {
            totalDownloaded += bytes;
          });
        });
        const totalBytes = event.totalBytes;
        return (totalDownloaded / totalBytes) * 100;
      },
    }),
    {
      name: "download-store",
      enabled: isDevEnvironment(),
    }
  )
);
