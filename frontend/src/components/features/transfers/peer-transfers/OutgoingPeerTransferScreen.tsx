import { InitiateP2PSessionResponse } from "@/api/services/transferService";
import { useEffect, useRef, useState } from "react";
import PeerTransferManager, {
  PeerTransferMode,
  PeerTransferState,
} from "@/lib/transfer/PeerTransferManager";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { LuLoaderCircle } from "react-icons/lu";
import { FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import { devOnly, isDevEnvironment } from "@/utils/dev";

const OutgoingPeerTransferScreen = ({
  transferData,
  files,
}: {
  transferData: InitiateP2PSessionResponse;
  files: File[];
}) => {
  // Use useRef to hold the manager instance without triggering re-renders
  const manager = useRef<PeerTransferManager<PeerTransferMode.OUTGOING> | null>(
    null
  );

  // Use useState to track state and progress for the UI
  const [status, setStatus] = useState<PeerTransferState>(
    PeerTransferState.IDLE
  );
  const [progress, setProgress] = useState(0); // 0.0 to 1.0
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Ensure this effect runs only once on mount
    if (manager.current || !files.length || !transferData) return;

    // 1. Define callbacks to update React state
    const callbacks = {
      onStateChange: (newState: PeerTransferState) => {
        setStatus(newState);
      },
      onProgress: (newProgress: number) => {
        setProgress(newProgress);
      },
      onError: (err: Error) => {
        devOnly(() => console.error("Peer Transfer Error:", err));
        setError(err.message || "An unknown error occurred.");
      },
    };

    // 2. Create the manager instance
    manager.current = new PeerTransferManager(
      {
        mode: PeerTransferMode.OUTGOING,
        files: files, // [cite: 2425, 2428]
        transferData: {
          room_id: transferData.room_id,
          session_key: transferData.owner_key,
        },
      },
      callbacks
    );

    // 3. Start the transfer
    manager.current.startTransfer();

    // 4. Return cleanup function
    return () => {
      // Strict Mode may call this twice, so guard against double or unintentional close
      if (!isDevEnvironment()) {
        manager.current?.close();
      }
    };
  }, [files, transferData]);

  // Helper to render UI based on state
  const renderStatus = () => {
    switch (status) {
      case PeerTransferState.CONNECTING_SIGNALING:
        return (
          <div className="flex items-center gap-2 text-neutral-500">
            <LuLoaderCircle className="animate-spin" />
            Connecting to signaling server...
          </div>
        );
      case PeerTransferState.WAITING_FOR_PEER:
        return (
          <div className="flex items-center gap-2 text-neutral-500">
            <LuLoaderCircle className="animate-spin" />
            Waiting for recipient to join...
          </div>
        );
      case PeerTransferState.CONNECTING_WEBRTC:
        return (
          <div className="flex items-center gap-2 text-neutral-500">
            <LuLoaderCircle className="animate-spin" />
            Establishing secure P2P connection...
          </div>
        );
      case PeerTransferState.TRANSFER_IN_PROGRESS:
        return (
          <div className="flex flex-col items-center gap-4 w-full">
            <span className="text-xl font-medium">Sending files...</span>
            <Progress value={progress * 100} className="w-full" />
            <span className="text-sm text-neutral-500">
              {Math.round(progress * 100)}%
            </span>
          </div>
        );
      case PeerTransferState.COMPLETED:
        return (
          <div className="flex items-center gap-2 text-green-600">
            <FaCheckCircle />
            Transfer complete!
          </div>
        );
      case PeerTransferState.FAILED:
        return (
          <div className="flex items-center gap-2 text-red-600">
            <FaExclamationCircle />
            Transfer failed: {error}
          </div>
        );
      case PeerTransferState.CLOSED:
        return <span className="text-neutral-500">Connection closed.</span>;
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto p-8 flex flex-col items-center gap-6">
      <h2 className="text-2xl font-semibold">Sending Transfer</h2>
      <div className="p-4">{renderStatus()}</div>
      <Button
        variant="outline"
        onClick={() => {
          manager.current?.close();
        }}
      >
        Cancel
      </Button>
    </div>
  );
};

export default OutgoingPeerTransferScreen;
