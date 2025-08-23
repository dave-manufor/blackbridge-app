import useAppHeader from "@/hooks/context/useAppHeader";
import { useEffect } from "react";

const TransferHistoryView = () => {
  const { setHeaderTitle } = useAppHeader();

  useEffect(() => {
    setHeaderTitle("Transfer History");
  }, [setHeaderTitle]);

  return <div>TransferHistoryView</div>;
};

export default TransferHistoryView;
