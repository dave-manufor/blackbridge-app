import storageKeys from "@/config/constants/storageKeys";
import { SessionStorageService } from "@/lib/WebStorageService";
import { useAuthStore } from "@/stores/authStore";
import { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useShallow } from "zustand/react/shallow";

const ProtectedRoute = ({
  children,
  asChild,
  bypassVerification = false,
}: {
  children?: ReactNode;
  asChild?: boolean;
  bypassVerification?: boolean;
}) => {
  const storage = new SessionStorageService();
  const { pathname, search, hash } = useLocation();
  const redirectPath = `${pathname}${search ? `?${search}` : ""}${
    hash ? `#${hash}` : ""
  }`;
  const { authenticated, user } = useAuthStore(
    useShallow((state) => ({
      authenticated: state.authenticated,
      user: state.user,
    }))
  );

  if (!authenticated) {
    storage.setItem(storageKeys.AUTH.REDIRECT, redirectPath);
    return <Navigate to="/sign-in" replace />;
  }

  if (!bypassVerification && !user?.verified) {
    storage.setItem(storageKeys.AUTH.REDIRECT, redirectPath);
    return <Navigate to="/verification" replace />;
  }

  return asChild ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
