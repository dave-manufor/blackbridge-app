import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import PeerTransferManager, {
  PeerTransferMode,
  PeerTransferState,
} from "@/lib/transfer/PeerTransferManager";
import { LuLoaderCircle, LuWifi, LuPlay } from "react-icons/lu";
import { FaCheckCircle, FaExclamationCircle, FaFile } from "react-icons/fa";
import { useParams } from "react-router";
import { useGetP2PSessionDetails } from "@/hooks/queries";
import { devOnly } from "@/utils/dev";
import { Card } from "@/components/ui/card";
import { P2PSessionProgress } from "@/lib/storage/p2pStorageKeys";
import streamSaver from "streamsaver";
import useAppHeader from "@/hooks/context/useAppHeader";

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

const formatSize = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const PeerTransferSession = () => {
  const {setHeaderTitle} = useAppHeader()
  const { sessionID } = useParams<{ sessionID: string }>();
  if (!sessionID) throw new Error("Session ID is required");

  const { data: transferData } = useGetP2PSessionDetails(sessionID);
  const manager = useRef<PeerTransferManager<PeerTransferMode.INCOMING> | null>(null);

  const [status, setStatus] = useState<PeerTransferState>(PeerTransferState.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [progressDetails, setProgressDetails] = useState<P2PSessionProgress | null>(null);
  const [speed, setSpeed] = useState<string>("0 MB/s");
  const [eta, setEta] = useState<string>("--");
  const [started, setStarted] = useState(false);

  // Speed calculation refs
  const lastBytesRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (manager.current || !transferData) return;

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
        saveFile(file).catch(() =>
          setError(`Failed to save file: ${file.name}`)
        );
      },
      onProgress: (newProgress: number, details?: P2PSessionProgress) => {
        setProgress(newProgress);
        if (details) {
          setProgressDetails(details);
          
          // Calculate speed and ETA
          const now = Date.now();
          const timeDiff = (now - lastTimeRef.current) / 1000; // seconds
          
          if (timeDiff >= 1) { // Update every second
            const bytesDiff = details.overallBytesTransferred - lastBytesRef.current;
            const bytesPerSec = bytesDiff / timeDiff;
            
            setSpeed(`${formatSize(bytesPerSec)}/s`);
            
            if (bytesPerSec > 0) {
              const remainingBytes = details.overallTotalBytes - details.overallBytesTransferred;
              const secondsRemaining = remainingBytes / bytesPerSec;
              setEta(secondsRemaining < 60 
                ? `${Math.ceil(secondsRemaining)}s` 
                : `${Math.ceil(secondsRemaining / 60)}m`);
            }

            lastBytesRef.current = details.overallBytesTransferred;
            lastTimeRef.current = now;
          }
        }
      }
    };

    manager.current = new PeerTransferManager(
      {
        mode: PeerTransferMode.INCOMING,
        transferData: {
          room_id: transferData.room_id,
          session_key: transferData.is_owner
            ? transferData.owner_key
            : transferData.recipient_key,
          files: transferData.files_meta as { name: string; size: number; type?: string }[],
        },
      },
      callbacks
    );

    // Check for resume state
    if (manager.current.hasResumedState()) {
      devOnly(() => console.log("Resumed state detected, auto-starting..."));
      setStarted(true);
      manager.current.startTransfer();
    }

    return () => {
      manager.current?.close();
    };
  }, [transferData]);

  useEffect(() => {
    setHeaderTitle("P2P Transfer Session");
  }, []);

  const handleStart = () => {
    if (manager.current && !started) {
      setStarted(true);
      manager.current.startTransfer();
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case PeerTransferState.COMPLETED: return "text-green-500";
      case PeerTransferState.FAILED: return "text-red-500";
      case PeerTransferState.TRANSFER_IN_PROGRESS: return "text-blue-500";
      default: return "text-neutral-500";
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case PeerTransferState.IDLE: return "Initializing...";
      case PeerTransferState.CONNECTING_SIGNALING: return "Connecting to signaling server...";
      case PeerTransferState.WAITING_FOR_PEER: return "Waiting for sender to join...";
      case PeerTransferState.CONNECTING_WEBRTC: return "Establishing secure P2P connection...";
      case PeerTransferState.CONNECTION_ESTABLISHED: return "Connected! Starting transfer...";
      case PeerTransferState.TRANSFER_IN_PROGRESS: return "Receiving files...";
      case PeerTransferState.COMPLETED: return "Transfer complete!";
      case PeerTransferState.FAILED: return "Transfer failed";
      case PeerTransferState.CLOSED: return "Connection closed";
      default: return "";
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header Status */}
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold text-neutral-900">
          P2P Transfer Session
        </h1>
        
        {!started ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-neutral-500 max-w-md mx-auto">
              Ready to receive {transferData?.files_meta?.length || 0} files. 
              Click start when you are ready to begin the transfer.
            </p>
            <Button 
              size="lg" 
              onClick={handleStart}
              className="px-8"
            >
              <LuPlay className="w-4 h-4 mr-2" />
              Start Transfer
            </Button>
          </div>
        ) : (
          <div className={`flex items-center justify-center gap-2 ${getStatusColor()}`}>
            {status === PeerTransferState.TRANSFER_IN_PROGRESS ? (
              <LuLoaderCircle className="animate-spin w-5 h-5" />
            ) : status === PeerTransferState.COMPLETED ? (
              <FaCheckCircle className="w-5 h-5" />
            ) : status === PeerTransferState.FAILED ? (
              <FaExclamationCircle className="w-5 h-5" />
            ) : (
              <LuWifi className="w-5 h-5" />
            )}
            <span className="font-medium">{getStatusMessage()}</span>
          </div>
        )}
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>

      {/* Main Progress Card */}
      <Card className="p-8 bg-white border-neutral-200 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Circular Progress */}
          <div className="relative w-48 h-48 flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                className="stroke-neutral-100"
                strokeWidth="12"
                fill="none"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                className="stroke-primary-600 transition-all duration-500 ease-out"
                strokeWidth="12"
                fill="none"
                strokeDasharray={2 * Math.PI * 88}
                strokeDashoffset={2 * Math.PI * 88 * (1 - progress)}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-neutral-900 tabular-nums">
                {Math.round(progress * 100)}%
              </span>
              <span className="text-sm text-neutral-500 mt-1 tabular-nums">
                {status === PeerTransferState.COMPLETED ? "Done" : eta + " remaining"}
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="flex-1 grid grid-cols-2 gap-6 w-full">
            <div className="space-y-1">
              <p className="text-sm text-neutral-500">Transfer Speed</p>
              <p className="text-2xl font-semibold text-neutral-900 tabular-nums">
                {status === PeerTransferState.TRANSFER_IN_PROGRESS ? speed : "--"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-neutral-500">Data Transferred</p>
              <p className="text-2xl font-semibold text-neutral-900 tabular-nums">
                {progressDetails 
                  ? `${formatSize(progressDetails.overallBytesTransferred)} / ${formatSize(progressDetails.overallTotalBytes)}`
                  : "--"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-neutral-500">Files Completed</p>
              <p className="text-2xl font-semibold text-neutral-900 tabular-nums">
                {progressDetails 
                  ? `${progressDetails.files.filter(f => f.status === 'complete').length} / ${progressDetails.files.length}`
                  : "--"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-neutral-500">Connection Quality</p>
              <div className="flex items-center gap-2 text-green-600">
                <LuWifi className="w-5 h-5" />
                <span className="font-medium">Excellent</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* File List */}
      {progressDetails && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-neutral-900">Files</h3>
          <div className="grid gap-3">
            {progressDetails.files.map((file, index) => (
              <div 
                key={index}
                className={`p-4 rounded-lg border flex items-center justify-between transition-colors ${
                  file.status === 'transferring' 
                    ? 'bg-primary-50 border-primary-200' 
                    : 'bg-white border-neutral-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${
                    file.status === 'complete' ? 'bg-green-100 text-green-600' :
                    file.status === 'transferring' ? 'bg-primary-100 text-primary-600' :
                    'bg-neutral-100 text-neutral-400'
                  }`}>
                    <FaFile className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900">{file.name}</p>
                    <p className="text-xs text-neutral-500 tabular-nums">
                      {formatSize(file.bytesTransferred)} / {formatSize(file.totalBytes)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {file.status === 'transferring' && (
                    <span className="text-xs font-medium text-primary-600 animate-pulse">
                      Transferring...
                    </span>
                  )}
                  {file.status === 'complete' && (
                    <FaCheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {file.status === 'queued' && (
                    <span className="text-xs text-neutral-400">Queued</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PeerTransferSession;
