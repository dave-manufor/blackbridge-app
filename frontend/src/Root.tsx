import { Outlet, ScrollRestoration } from "react-router";
import ToastWrapper from "./components/overlay/ToastWrapper";
import LoadScreen from "./components/overlay/LoadScreen";
import { useAuthStore } from "./stores/authStore";
import { useEffect, useRef } from "react";
import DownloadsDrawer from "./components/overlay/DownloadsDrawer";

function Root() {
  const authInitialized = useAuthStore((state) => state.authInitialized);
  const validateSession = useAuthStore((state) => state.validateSession);
  const validatedRef = useRef(false);

  useEffect(() => {
    if (!validatedRef.current) {
      validatedRef.current = true;
      validateSession();
    }
  }, [validateSession]);

  return (
    <>
      {authInitialized ? (
        <>
          <Outlet />
        </>
      ) : (
        <LoadScreen />
      )}
      <ToastWrapper />
      <DownloadsDrawer />
      <ScrollRestoration />
    </>
  );
}

export default Root;
