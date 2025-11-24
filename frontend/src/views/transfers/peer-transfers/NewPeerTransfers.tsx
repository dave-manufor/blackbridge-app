import { InitiateP2PSessionResponse } from "@/api/services/transferService";
import InitiatePeerTransferScreen from "@/components/features/transfers/peer-transfers/InitiatePeerTransferScreen";
import OutgoingPeerTransferScreen from "@/components/features/transfers/peer-transfers/OutgoingPeerTransferScreen";
import { Reducer, useReducer, useState } from "react";

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
  const [files, setFiles] = useState<File[]>([]);
  const [transferData, setTransferData] =
    useState<InitiateP2PSessionResponse | null>(null);
  const [currentScreen, dispatchScreen] = useReducer(
    screenDispatch,
    Screens.Initiate
  );

  const handleCompleteInitiation = (data: InitiateP2PSessionResponse) => {
    setTransferData(data);
    dispatchScreen({ type: "NEXT" });
  };

  return (
    <>
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
