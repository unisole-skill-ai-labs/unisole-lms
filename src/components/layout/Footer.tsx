import React from "react";
import { useLocation } from "react-router-dom";

export default function Footer() {
  const { pathname } = useLocation();
  const isPlayer = pathname.startsWith("/learn/") || pathname.startsWith("/player/");

  return (
    <footer
      className={`w-full border-t border-zinc-200/80 dark:border-zinc-800/80 py-4 px-4 bg-transparent text-center text-xs text-zinc-500 dark:text-zinc-400 ${
        isPlayer ? "pb-4" : "pb-20 md:pb-4"
      }`}
    >
      <p className="max-w-7xl mx-auto">
        © {new Date().getFullYear()} Unisole Skill AI Labs Private Limited. All rights reserved.
      </p>
    </footer>
  );
}
