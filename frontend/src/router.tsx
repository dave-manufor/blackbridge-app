import { createBrowserRouter, Navigate } from "react-router";
import Root from "./Root";
import { SignInView, SignUpView, VerificationView } from "./views/auth";
import ProtectedRoute from "./components/routes/ProtectedRoute";
import DashboardView from "./views/dashboard/DashboardView";
import SideBarLayout from "./layouts/SideBarLayout";
import { TransferDetailsView, TransferHistoryView } from "./views/transfers";
import TransferListAll from "./views/transfers/TransferListAll";
import TransferListSent from "./views/transfers/TransferListSent";
import TransferListReceived from "./views/transfers/TransferListReceived";
import { TransferListProvider } from "./contexts/TransferListContext";
import PublicLinkView from "./views/public/PublicLinkView";

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
                    <TransferHistoryView />
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
                ],
              },
              {
                path: ":transferID",
                element: <TransferDetailsView />,
              },
            ],
          },
        ],
      },
      // Public Routes
      {
        path: "p",
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
