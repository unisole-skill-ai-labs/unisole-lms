import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useExchangeSsoCodeMutation } from "../store/apiSlice";
import { setCredentials } from "../store/authSlice";

const ALLOWED_ROUTE_PREFIXES = ["/learn/", "/player/", "/pathways/", "/enrolled", "/dashboard"];

export function validateNextUrl(rawNext: string | null): string {
  if (!rawNext || typeof rawNext !== "string") {
    return "/dashboard";
  }

  const trimmed = rawNext.trim();

  // Must start with single '/' and not '//'
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return "/dashboard";
  }

  // Must not contain any scheme or protocol indicator (e.g. 'http:', 'https:', 'javascript:')
  // or backslash
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) || trimmed.includes(":") || trimmed.includes("\\")) {
    return "/dashboard";
  }

  // Allowlist check: must match or start with one of the allowed prefixes
  const isAllowed = ALLOWED_ROUTE_PREFIXES.some(
    (allowed) => trimmed === allowed || trimmed.startsWith(allowed)
  );

  return isAllowed ? trimmed : "/dashboard";
}

export default function SsoExchangePage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [exchangeSsoCode] = useExchangeSsoCodeMutation();

  const storedToken = useSelector((s: any) => s.auth.token) || localStorage.getItem("unisole-app:token");
  const [statusMessage] = useState("Authenticating secure session...");
  const exchangedRef = useRef(false);

  useEffect(() => {
    // 1. Strict Referrer Policy: Ensure referrer is never sent on this page
    let meta = document.querySelector('meta[name="referrer"]') as HTMLMetaElement | null;
    let addedMeta = false;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "referrer";
      meta.content = "no-referrer";
      document.head.appendChild(meta);
      addedMeta = true;
    } else {
      meta.content = "no-referrer";
    }

    // 2. Read query parameters immediately
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const rawNext = params.get("next");
    const validatedNext = validateNextUrl(rawNext);

    // 3. Immediately scrub query parameters from browser URL to prevent leak in history
    window.history.replaceState({}, document.title, window.location.pathname);

    // 4. Handle code exchange once
    if (exchangedRef.current) return;
    exchangedRef.current = true;

    if (!code) {
      // If code is missing:
      if (storedToken) {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/login?error=session_expired", {
          replace: true,
          state: { error: "Session expired, please log in" },
        });
      }
      return;
    }

    const performExchange = async () => {
      try {
        const response = await exchangeSsoCode({ code }).unwrap();
        dispatch(setCredentials(response));
        navigate(validatedNext, { replace: true });
      } catch (err: any) {
        console.error("SSO Code exchange failed:", err);
        if (storedToken) {
          // If already logged in, navigate safely to dashboard
          navigate("/dashboard", { replace: true });
        } else {
          // No session, redirect to login with session expired message
          navigate("/login?error=session_expired", {
            replace: true,
            state: { error: "Session expired, please log in" },
          });
        }
      }
    };

    performExchange();

    return () => {
      if (addedMeta && meta?.parentNode) {
        meta.parentNode.removeChild(meta);
      }
    };
  }, [dispatch, exchangeSsoCode, navigate, storedToken]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mb-4">
        <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
      <h2 className="text-lg font-bold text-white tracking-tight mb-1">
        Entering LMS
      </h2>
      <p className="text-xs text-slate-400 font-mono">
        {statusMessage}
      </p>
    </div>
  );
}
