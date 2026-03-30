import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../lib/auth";

type ProtectedRouteProps = {
  allowedRoles?: UserRole[];
};

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { session, isAuthenticated } = useAuth();

  if (!isAuthenticated || !session) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
