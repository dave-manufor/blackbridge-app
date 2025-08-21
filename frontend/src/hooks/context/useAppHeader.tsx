import { useContext } from "react";
import AppHeaderContext from "@contexts/AppHeaderContext";

const useAppHeader = () => {
  const context = useContext(AppHeaderContext);
  if (!context) {
    throw new Error("useAppHeader must be used within an AppHeaderProvider");
  }
  return context;
};

export default useAppHeader;
