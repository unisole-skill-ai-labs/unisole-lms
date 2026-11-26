import React from "react";

export default function SupportPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/70 dark:bg-[#0B0D13] flex items-center justify-center p-6 transition-colors">
      <div className="max-w-md w-full bg-white dark:bg-[#121622] rounded-3xl p-6 sm:p-8 border border-zinc-200/80 dark:border-zinc-800 shadow-xs text-center">
        <p className="text-sm sm:text-base font-semibold text-zinc-800 dark:text-zinc-100">
          If you face any issue, please contact your mentor.
        </p>
      </div>
    </div>
  );
}
