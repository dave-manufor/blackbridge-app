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

const router = createBrowserRouter([
  // Auth Routes
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
            path: "/",
            element: <DashboardView />,
          },
          {
            path: "/transfers",
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
                path: "/transfers/sent",
                element: <TransferListSent />,
              },
              {
                path: "/transfers/received",
                element: <TransferListReceived />,
              },
            ],
          },
          {
            path: "/transfers/:transferID",
            element: <TransferDetailsView />,
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
