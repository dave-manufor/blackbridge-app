import ComingSoonState from "@/components/ui/ComingSoonState";
import useAppHeader from "@/hooks/context/useAppHeader";
import { useEffect } from "react";

const FileRequests = () => {
  const { setHeaderTitle } = useAppHeader();
  useEffect(() => {
    setHeaderTitle("File Requests");
  }, [setHeaderTitle]);
  return <ComingSoonState />;
};

export default FileRequests;
