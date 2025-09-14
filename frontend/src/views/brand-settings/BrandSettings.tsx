import ComingSoonState from "@/components/ui/ComingSoonState";
import useAppHeader from "@/hooks/context/useAppHeader";
import { useEffect } from "react";

const BrandSettings = () => {
  const { setHeaderTitle } = useAppHeader();
  useEffect(() => {
    setHeaderTitle("Brand Settings");
  }, [setHeaderTitle]);
  return <ComingSoonState />;
};

export default BrandSettings;
