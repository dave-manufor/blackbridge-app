import { useAuthStore } from "@/stores/authStore";
import { ReactNode } from "react";
import { Navigate, Outlet } from "react-router";
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
  const { authenticated, user } = useAuthStore(
    useShallow((state) => ({
      authenticated: state.authenticated,
      user: state.user,
    }))
  );

  if (!authenticated) {
    return <Navigate to="/sign-in" replace />;
  }

  if (!bypassVerification && !user?.verified) {
    return <Navigate to="/verification" replace />;
  }

  return asChild ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
