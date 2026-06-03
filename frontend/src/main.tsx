import { createRoot } from "react-dom/client";
import "./index.css";
import { RouterProvider } from "react-router";
import router from "./router";
import { QueryClientProvider } from "@tanstack/react-query";
import { SidebarProvider } from "./components/ui/sidebar";
import { AppHeaderProvider } from "@contexts/AppHeaderContext";
import queryClient from "./lib/queryClient";
import BaseModal from "react-modal";
import { devOnly } from "./utils/dev";
import { CryptoBridge } from "./lib/crypto/workers/CryptoBridge";
import { useAuthStore } from "./stores/authStore";
import streamsaver from "streamsaver";

BaseModal.setAppElement("#root");
streamsaver.mitm = import.meta.env.VITE_APP_BASE_URL + "/mitm.html";

// Spawn crypto workers as easily as possible (non-blocking)
CryptoBridge.getInstance()
  .spawn()
  .then(() => devOnly(() => console.log("CryptoBridge spawned")))
  .catch((err) => {
    devOnly(() => console.error("Failed to spawn CryptoBridge", err));
    useAuthStore.getState().signOut();
  });

createRoot(document.getElementById("root")!).render(
  // <StrictMode>
  <QueryClientProvider client={queryClient}>
    <AppHeaderProvider>
      <SidebarProvider>
        <RouterProvider router={router} />
      </SidebarProvider>
    </AppHeaderProvider>
  </QueryClientProvider>
  // </StrictMode>
);
