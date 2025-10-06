import useAppHeader from "@/hooks/context/useAppHeader";
import { useEffect } from "react";

const NewPeerTransfer = () => {
  const { setHeaderTitle } = useAppHeader();

  useEffect(() => {
    setHeaderTitle("Peer Transfer");
  }, [setHeaderTitle]);

  return <div>CreatePeerTransfer</div>;
};

export default NewPeerTransfer;
