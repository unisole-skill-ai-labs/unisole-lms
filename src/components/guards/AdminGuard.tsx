import React from "react";
import { Navigate, useLocation, Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { ShieldAlert, LogOut, ArrowRight, ArrowLeft } from "lucide-react";
import { logout } from "../../store/authSlice";

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { isAuthenticated, user, token } = useSelector((state: any) => state.auth);
  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // 1. Not signed in: redirect directly to the separate /admin/login page
  if (!isAuthenticated || !token) {
    return <Navigate to="/admin/login" replace />;
  }

  // 2. Check Role
  const role = user?.role ? String(user.role).toUpperCase() : "";
  const userRoles = [
    role,
    ...(Array.isArray(user?.roles) ? user.roles.map((r: any) => String(r).toUpperCase()) : []),
    ...(Array.isArray(user?.metadata?.roles) ? user.metadata.roles.map((r: any) => String(r).toUpperCase()) : []),
  ];
  const isAllowed = userRoles.some((r) =>
    ["ADMIN", "SUPER_ADMIN", "MENTOR", "MEMBER", "COURSE_MANAGER", "PROGRAM_MANAGER"].includes(r)
  );

  // 3. User is logged in as a STUDENT: Redirect to /dashboard
  if (!isAllowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
