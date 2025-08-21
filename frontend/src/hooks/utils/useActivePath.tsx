import { useLocation } from "react-router";

const useActivePath = () => {
  const location = useLocation();
  const activePath = location.pathname;

  return {
    activePath,
    isActive: (path: string) => activePath === path,
    isPartiallyActive: (path: string) => activePath.startsWith(path),
  };
};

export default useActivePath;
