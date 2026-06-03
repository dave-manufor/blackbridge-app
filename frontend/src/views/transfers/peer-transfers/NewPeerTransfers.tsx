import { InitiateP2PSessionResponse } from "@/api/services/transferService";
import InitiatePeerTransferScreen from "@/components/features/transfers/peer-transfers/InitiatePeerTransferScreen";
import OutgoingPeerTransferScreen from "@/components/features/transfers/peer-transfers/OutgoingPeerTransferScreen";
import { Reducer, useReducer, useState, useEffect } from "react";
import { useP2PResumeState } from "@/hooks/useP2PResumeState";
import { ResumeTransferDialog } from "@/components/dialogs/ResumeTransferDialog";
import { fileHandleStore } from "@/lib/storage/fileHandleStore";
import { useNavigate } from "react-router";
import { toast } from "react-hot-toast";

enum Screens {
  Initiate = "initiate",
  Transfer = "transfer",
}
type ScreenActions = { type: "NEXT" | "PREVIOUS" };

const screenDispatch: Reducer<Screens, ScreenActions> = (
  prevState: Screens,
  action: ScreenActions
) => {
  switch (action.type) {
    case "NEXT":
      return prevState === Screens.Initiate ? Screens.Transfer : prevState;
    case "PREVIOUS":
      return prevState === Screens.Transfer ? Screens.Initiate : prevState;
    default:
      return prevState;
  }
};

const NewPeerTransfer = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [transferData, setTransferData] =
    useState<InitiateP2PSessionResponse | null>(null);
  const [currentScreen, dispatchScreen] = useReducer(
    screenDispatch,
    Screens.Initiate
  );

  const { resumableSession, dismissSession, isChecking } = useP2PResumeState();
  const [showResumeDialog, setShowResumeDialog] = useState(false);

  useEffect(() => {
    if (resumableSession && !isChecking) {
      setShowResumeDialog(true);
    }
  }, [resumableSession, isChecking]);

  const handleResume = async () => {
    if (!resumableSession) return;

    try {
      // 1. Try to get file handles
      const handles = await fileHandleStore.getFileHandles(resumableSession.sessionId);
      
      if (handles && handles.length > 0) {
        // 2. Validate handles (browser might prompt for permission here)
        const isValid = await fileHandleStore.validateHandles(handles, resumableSession.files);
        
        if (isValid) {
          // 3. Navigate to session
          navigate(`/transfers/peer/${resumableSession.sessionId}`);
          return;
        }
      }

      // Fallback: If no handles or invalid, we can't fully resume automatically
      // But we can navigate there and let the user re-select if we implemented that flow
      // For now, let's just tell them we can't resume automatically
      toast.error("Could not restore file access. Please start a new transfer.");
      setShowResumeDialog(false);
      dismissSession(resumableSession.sessionId, false);
      
    } catch (error) {
      console.error("Resume failed:", error);
      toast.error("Failed to resume transfer");
    }
  };

  const handleStartNew = (dontAskAgain: boolean) => {
    if (resumableSession) {
      dismissSession(resumableSession.sessionId, dontAskAgain);
    }
    setShowResumeDialog(false);
  };

  const handleCompleteInitiation = async (data: InitiateP2PSessionResponse) => {
    setTransferData(data);
    
    // Save file handles for future resumption
    if (files.length > 0 && 'showOpenFilePicker' in window) {
      // We can't easily get handles from a standard input[type=file] 
      // unless we used the File System Access API to select them initially.
      // If InitiatePeerTransferScreen used standard input, we might not have handles.
      // This is a limitation. For now, we'll just proceed.
      // To fully support resume, InitiatePeerTransferScreen needs to support 
      // File System Access API selection.
    }

    dispatchScreen({ type: "NEXT" });
  };

  return (
    <>
      {resumableSession && (
        <ResumeTransferDialog 
          open={showResumeDialog}
          session={resumableSession}
          onResume={handleResume}
          onStartNew={handleStartNew}
        />
      )}

      {currentScreen === Screens.Initiate && (
        <InitiatePeerTransferScreen
          setFiles={setFiles}
          onComplete={handleCompleteInitiation}
        />
      )}
      {currentScreen === Screens.Transfer && transferData && (
        <OutgoingPeerTransferScreen transferData={transferData} files={files} />
      )}
    </>
  );
};

export default NewPeerTransfer;
