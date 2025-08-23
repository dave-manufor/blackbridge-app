import useAppHeader from "@/hooks/context/useAppHeader";
import { useEffect } from "react";
import { useParams } from "react-router";

const TransferDetailsView = () => {
  const { setHeaderTitle } = useAppHeader();
  const { transferID } = useParams();

  useEffect(() => {
    setHeaderTitle(`Transfer Details: ${transferID}`);
  }, [transferID, setHeaderTitle]);

  return <div>TransferDetailsView: {transferID}</div>;
};

export default TransferDetailsView;
