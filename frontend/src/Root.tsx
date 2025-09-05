import { Outlet, ScrollRestoration } from "react-router";
import ToastWrapper from "./components/overlay/ToastWrapper";
import LoadScreen from "./components/overlay/LoadScreen";
import { useAuthStore } from "./stores/authStore";
import { useEffect, useRef } from "react";
import DownloadsDrawer from "./components/overlay/DownloadsDrawer";
import Userback from "@userback/widget";
import { devOnly } from "./utils/dev";

const userbackApiKey =
  (import.meta.env.VITE_USERBACK_API_KEY as string) || undefined;

function Root() {
  const authInitialized = useAuthStore((state) => state.authInitialized);
  const validateSession = useAuthStore((state) => state.validateSession);
  const validatedRef = useRef(false);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!validatedRef.current) {
      validatedRef.current = true;
      validateSession();
    }

    if (authInitialized && userbackApiKey) {
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
    } else {
      console.warn("Unable to setup Userback");
    }
  }, [validateSession, user]);

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
