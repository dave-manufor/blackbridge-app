import { createBrowserRouter, Navigate } from "react-router";
import Root from "./Root";
import { SignInView, SignUpView, VerificationView } from "./views/auth";
import ProtectedRoute from "./components/features/navigation/ProtectedRoute";
import DashboardView from "./views/dashboard/DashboardView";
import SideBarLayout from "./layouts/SideBarLayout";
import {
  TransferDetailsView,
  TransferListLayout,
  TransferListAll,
  TransferListSent,
  TransferListReceived,
  TransferListLinks,
} from "./views/transfers";
import { TransferListProvider } from "./contexts/TransferListContext";
import PublicLinkView from "./views/public/PublicLinkView";
import PublicLayout from "./layouts/PublicLayout";
import {
  AccountSettings,
  BillingSettings,
  NotificationSettings,
  SettingsLayout,
} from "./views/settings";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      // Auth Routes
      {
        path: "/sign-up",
        element: <SignUpView />,
      },
      {
        path: "/sign-in",
        element: <SignInView />,
      },
      {
        path: "/verification",
        element: (
          <ProtectedRoute asChild bypassVerification>
            <VerificationView />
          </ProtectedRoute>
        ),
      },
      // Protected User Routes
      {
        path: "/",
        element: (
          <ProtectedRoute asChild>
            <SideBarLayout />
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: <DashboardView />,
          },
          {
            path: "transfers",
            children: [
              {
                // Lists
                path: "",
                element: (
                  <TransferListProvider>
                    <TransferListLayout />
                  </TransferListProvider>
                ),
                children: [
                  {
                    index: true,
                    element: <TransferListAll />,
                  },
                  {
                    path: "sent",
                    element: <TransferListSent />,
                  },
                  {
                    path: "received",
                    element: <TransferListReceived />,
                  },
                  {
                    path: "links",
                    element: <TransferListLinks />,
                  },
                ],
              },
              {
                path: ":transferID",
                element: <TransferDetailsView />,
              },
            ],
          },
          {
            path: "settings",
            children: [
              {
                path: "",
                element: <SettingsLayout />,
                children: [
                  { path: "account", element: <AccountSettings /> },
                  { path: "notifications", element: <NotificationSettings /> },
                  { path: "billing", element: <BillingSettings /> },
                ],
              },
            ],
          },
        ],
      },
      // Public Routes
      {
        path: "p",
        element: <PublicLayout />,
        children: [
          {
            path: "shares/:slug",
            element: <PublicLinkView />,
          },
        ],
      },
      // Redirect to dashboard if no route is matched
      {
        path: "*",
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);

export default router;
