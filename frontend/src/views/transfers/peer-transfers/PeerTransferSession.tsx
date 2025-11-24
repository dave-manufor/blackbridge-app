import { useEffect, useRef, useState } from "react";
import PeerTransferManager, {
  PeerTransferMode,
  PeerTransferState,
} from "@/lib/transfer/PeerTransferManager";
import { LuLoaderCircle } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import streamSaver from "streamsaver";
import { FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import { useParams } from "react-router";
import FileCard from "@/components/ui/FileCard";
import { useGetP2PSessionDetails } from "@/hooks/queries";
import { devOnly } from "@/utils/dev";

// Helper function to save the received file
// This is similar to your downloader's logic [cite: 1759-1762]
const saveFile = async (file: File) => {
  const fileStream = streamSaver.createWriteStream(file.name, {
    size: file.size,
  });
  const writer = fileStream.getWriter();
  const reader = file.stream().getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    await writer.write(value);
  }
  await writer.close();
};

const PeerTransferSession = () => {
  const { sessionID } = useParams<{ sessionID: string }>();
  if (!sessionID) {
    throw new Error("Session ID is required");
  }

  const { data: transferData, isLoading } = useGetP2PSessionDetails(sessionID);

  const manager = useRef<PeerTransferManager<PeerTransferMode.INCOMING> | null>(
    null
  );

  const [status, setStatus] = useState<PeerTransferState>(
    PeerTransferState.IDLE
  );
  const [error, setError] = useState<string | null>(null);
  const [receivedFiles, setReceivedFiles] = useState<File[]>([]);

  useEffect(() => {
    // Wait for transferData to be loaded
    if (manager.current || !transferData) return;

    // 1. Define callbacks
    const callbacks = {
      onStateChange: (newState: PeerTransferState) => {
        devOnly(() => console.log("Peer Transfer State:", newState));
        setStatus(newState);
      },
      onError: (err: Error) => {
        devOnly(() => console.error("Peer Transfer Error:", err));
        setError(err.message || "An unknown error occurred.");
      },
      onFileReceived: (file: File) => {
        devOnly(() => console.log("Peer Transfer File Received:", file));
        setReceivedFiles((prevFiles) => [...prevFiles, file]);
        // Automatically save the file
        saveFile(file).catch((err) =>
          setError(`Failed to save file: ${file.name}`)
        );
      },
      // onProgress is not used by the receiver
    };

    // 2. Create the manager instance
    manager.current = new PeerTransferManager(
      {
        mode: PeerTransferMode.INCOMING,
        transferData: {
          room_id: transferData.room_id,
          session_key: transferData.is_owner
            ? transferData.owner_key
            : transferData.recipient_key,
        },
      },
      callbacks
    );

    // 3. Start the manager
    manager.current.startTransfer();

    // 4. Return cleanup function
    return () => {
      manager.current?.close();
    };
  }, [transferData]);

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
            Waiting for sender...
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
          <div className="flex items-center gap-2 text-blue-600">
            <LuLoaderCircle className="animate-spin" />
            Receiving files...
          </div>
        );
      case PeerTransferState.COMPLETED:
        return (
          <div className="flex items-center gap-2 text-green-600">
            <FaCheckCircle />
            Transfer complete! Files saved.
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

  if (isLoading) {
    return (
      <div className="w-full max-w-lg mx-auto p-8 flex flex-col items-center gap-6">
        <LuLoaderCircle className="animate-spin" />
        <span>Loading session...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto p-8 flex flex-col items-center gap-6">
      <h2 className="text-2xl font-semibold">Receiving Transfer</h2>
      <div className="p-4">{renderStatus()}</div>

      {receivedFiles.length > 0 && (
        <div className="w-full flex flex-col gap-2">
          <h3 className="text-lg font-medium">Received Files</h3>
          {receivedFiles.map((file, index) => (
            <FileCard
              key={index}
              name={file.name}
              contentType={file.type}
              size={file.size}
              allowDownload={false} // No download action needed, it's already saved
              variant="form"
              onRemove={() => {
                setReceivedFiles((prevFiles) =>
                  prevFiles.filter((_, i) => i !== index)
                );
              }}
            />
          ))}
        </div>
      )}

      <Button
        variant="outline"
        onClick={() => {
          manager.current?.close();
        }}
      >
        Close Connection
      </Button>
    </div>
  );
};

export default PeerTransferSession;
