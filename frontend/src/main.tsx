import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { RouterProvider } from "react-router";
import router from "./router";
import { QueryClientProvider } from "@tanstack/react-query";
import { SidebarProvider } from "./components/ui/sidebar";
import { AppHeaderProvider } from "@contexts/AppHeaderContext";
import queryClient from "./lib/queryClient";
import BaseModal from "react-modal";

BaseModal.setAppElement("#root");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppHeaderProvider>
        <SidebarProvider>
          <RouterProvider router={router} />
        </SidebarProvider>
      </AppHeaderProvider>
    </QueryClientProvider>
  </StrictMode>
);
