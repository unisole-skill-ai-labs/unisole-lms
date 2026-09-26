import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Lock, User, Phone, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import MobileOtpForm from "../features/auth/MobileOtpForm";
import { useAdminLoginMutation } from "../store/apiSlice";
import { setCredentials } from "../store/authSlice";

export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const redirectTarget =
    new URLSearchParams(location.search).get("redirect") ||
    (location.state as any)?.from?.pathname ||
    "/enrolled";

  const isStaffIntent = redirectTarget.includes("admin");

  const [authMode, setAuthMode] = useState<"STUDENT" | "STAFF">(
    isStaffIntent ? "STAFF" : "STUDENT"
  );

  // Staff Form State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [staffError, setStaffError] = useState("");

  const [adminLoginMutation, { isLoading: isStaffLoggingIn }] = useAdminLoginMutation();

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError("");

    if (!username.trim() || !password) {
      setStaffError("Username or phone and password are required.");
      return;
    }

    try {
      const response = await adminLoginMutation({
        username: username.trim(),
        password,
      }).unwrap();

      dispatch(setCredentials(response));
      navigate(redirectTarget.startsWith("/admin") ? redirectTarget : "/admin", {
        replace: true,
      });
    } catch (err: any) {
      setStaffError(
        err?.data?.error ||
          err?.data?.message ||
          "Invalid staff credentials or insufficient privileges."
      );
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-md w-full space-y-4">
        {/* Auth Mode Tabs */}
        <div className="flex p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setAuthMode("STUDENT")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              authMode === "STUDENT"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Student Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => setAuthMode("STAFF")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              authMode === "STAFF"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
            <span>Staff / Mentor Sign In</span>
          </button>
        </div>

        {authMode === "STUDENT" ? (
          <MobileOtpForm />
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-6 sm:p-8 shadow-sm space-y-5 animate-fade-in">
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Staff & Mentor Portal
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Sign in with your staff account or mentor credentials to access the Course Studio and CMS.
              </p>
            </div>

            {staffError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-medium border border-red-200 dark:border-red-900/60 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{staffError}</span>
              </div>
            )}

            <form onSubmit={handleStaffLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Username or Mobile Number
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. girish or staff phone"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="Enter staff password..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isStaffLoggingIn}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
              >
                <span>{isStaffLoggingIn ? "Signing In..." : "Sign In to Studio"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
