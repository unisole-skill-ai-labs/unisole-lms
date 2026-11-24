import React from "react";
import { useLocation, Navigate, Link } from "react-router-dom";
import MobileOtpForm from "../features/auth/MobileOtpForm";

export default function LoginPage() {
  const location = useLocation();
  const redirectParam = new URLSearchParams(location.search).get("redirect");

  if (redirectParam && redirectParam.startsWith("/admin")) {
    return <Navigate to={`/admin/login?redirect=${encodeURIComponent(redirectParam)}`} replace />;
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 space-y-4">
      <MobileOtpForm />
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Course Author or Mentor?{" "}
        <Link to="/admin/login" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
          Sign in with Staff Password
        </Link>
      </p>
    </div>
  );
}
