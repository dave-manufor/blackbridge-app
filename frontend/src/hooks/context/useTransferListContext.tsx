import TransferListContext from "@/contexts/TransferListContext";
import { useContext } from "react";

const useTransferListContext = () => {
  const context = useContext(TransferListContext);
  if (!context) {
    throw new Error(
      "useTransferListContext must be used within a TransferListProvider"
    );
  }
  return context;
};

export default useTransferListContext;
