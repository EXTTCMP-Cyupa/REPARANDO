import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import { WorkerDashboard } from "./modules/worker/WorkerDashboard";
import { WorkerFinanceView } from "./modules/worker/WorkerFinanceView";
import { WorkerAllJobsView } from "./modules/worker/WorkerAllJobsView";
import { ClientDashboard } from "./modules/client/ClientDashboard";
import { AdminDashboard } from "./modules/admin/AdminDashboard";
import { MarketplaceView } from "./modules/marketplace/MarketplaceView";
import { BiddingView } from "./modules/bidding/BiddingView";
import { LoginPage } from "./modules/auth/LoginPage";

function HomeRedirect() {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;

  switch (session.user.role) {
    case "ADMIN":
      return <Navigate to="/admin" replace />;
    case "WORKER":
      return <Navigate to="/worker" replace />;
    case "CLIENT":
      return <Navigate to="/client" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}

function LoginRedirect() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <LoginPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRedirect />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomeRedirect />} />

          <Route element={<ProtectedRoute allowedRoles={["CLIENT", "WORKER"]} />}>
            <Route path="/marketplace" element={<MarketplaceView />} />
            <Route path="/bidding" element={<BiddingView />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["WORKER"]} />}>
            <Route path="/worker" element={<WorkerDashboard />} />
            <Route path="/worker/jobs" element={<WorkerAllJobsView />} />
            <Route path="/worker/finance" element={<WorkerFinanceView />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["CLIENT"]} />}>
            <Route path="/client" element={<ClientDashboard />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
