import { Outlet, ScrollRestoration } from "react-router";
import ToastWrapper from "./components/overlay/ToastWrapper";
import LoadScreen from "./components/overlay/LoadScreen";
import { useAuthStore } from "./stores/authStore";
import { useEffect, useRef } from "react";
import DownloadsDrawer from "./components/overlay/DownloadsDrawer";
import Userback from "@userback/widget";
import { devOnly, isDevEnvironment } from "./utils/dev";
import { useShallow } from "zustand/react/shallow";
import useHandleGlobalAction from "./hooks/useHandleGlobalAction";

const userbackApiKey =
  (import.meta.env.VITE_USERBACK_API_KEY as string) || undefined;

function Root() {
  const handleGlobalAction = useHandleGlobalAction();
  const { authenticated, authInitialized, validateSession, user } =
    useAuthStore(
      useShallow((state) => ({
        authenticated: state.authenticated,
        authInitialized: state.authInitialized,
        validateSession: state.validateSession,
        user: state.user,
      }))
    );
  const validatedRef = useRef(false);

  useEffect(() => {
    if (authenticated) {
      handleGlobalAction();
    }
  }, [authenticated, handleGlobalAction]);

  useEffect(() => {
    // Validate existing session only once
    if (!validatedRef.current) {
      validatedRef.current = true;
      validateSession();
    }
  }, [validateSession]);

  useEffect(() => {
    // Userback initialization
    if (authInitialized && userbackApiKey && !isDevEnvironment()) {
      const options = user
        ? {
            user_data: {
              id: user.id,
              info: {
                email: user.email,
              },
            },
          }
        : undefined;

      Userback(userbackApiKey, options)
        .then(() =>
          devOnly(() => console.log("Userback initialized successfully"))
        )
        .catch(() => console.warn("Unable to setup Userback"));
    }

    if (!userbackApiKey) {
      devOnly(() => console.warn("Userback API key not provided"));
    }
  }, [user, authInitialized]);

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
