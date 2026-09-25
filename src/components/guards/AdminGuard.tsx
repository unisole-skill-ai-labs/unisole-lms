import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { isAuthenticated, user } = useSelector((state: any) => state.auth);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const role = user?.role;
  const isAllowed = ["ADMIN", "SUPER_ADMIN", "MENTOR", "MEMBER"].includes(role);

  if (!isAllowed) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
