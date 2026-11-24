import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

export interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
  loginPath?: string;
}

export default function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo,
  loginPath,
}: ProtectedRouteProps) {
  const { isAuthenticated, user, token } = useSelector((state: any) => state.auth);
  const location = useLocation();

  if (!isAuthenticated || !token) {
    const defaultLogin = location.pathname.startsWith("/admin") ? "/admin/login" : "/login";
    const targetLogin = loginPath || defaultLogin;
    const redirectParam = location.pathname + location.search;
    return <Navigate to={`${targetLogin}?redirect=${encodeURIComponent(redirectParam)}`} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const role = user?.role ? String(user.role).toUpperCase() : "STUDENT";
    const userRoles = [
      role,
      ...(Array.isArray(user?.roles) ? user.roles.map((r: any) => String(r).toUpperCase()) : []),
      ...(Array.isArray(user?.metadata?.roles) ? user.metadata.roles.map((r: any) => String(r).toUpperCase()) : []),
    ].filter(Boolean);

    const hasPermission = allowedRoles.some((r) => userRoles.includes(String(r).toUpperCase()));
    if (!hasPermission) {
      // Redirect students away from /admin/* (and the Studio routes) to /dashboard
      const destination = redirectTo || "/dashboard";
      return <Navigate to={destination} replace />;
    }
  }

  return <>{children}</>;
}
