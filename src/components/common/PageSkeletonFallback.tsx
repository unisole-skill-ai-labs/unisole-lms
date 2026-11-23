import React, { useState, useEffect } from "react";

/**
 * Delayed page-shaped skeleton fallback.
 * Only appears if a route chunk takes more than 150ms to load.
 * Avoids any flash of loading state on fast networks / pre-warmed cache.
 */
export default function PageSkeletonFallback() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(true);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  if (!show) {
    return null; // Prevents any flash if chunk loads in < 150ms
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in transition-opacity duration-200">
      {/* Top Banner Skeleton */}
      <div className="h-9 w-44 bg-slate-200/70 dark:bg-slate-800/60 rounded-xl animate-pulse" />

      {/* Hero / Progress Card Skeleton */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#121622] border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-2xs">
        <div className="flex justify-between items-center">
          <div className="h-4 w-32 bg-slate-200/70 dark:bg-slate-800/60 rounded-md animate-pulse" />
          <div className="h-4 w-24 bg-slate-200/70 dark:bg-slate-800/60 rounded-md animate-pulse" />
        </div>
        <div className="h-6 w-3/4 bg-slate-200/70 dark:bg-slate-800/60 rounded-lg animate-pulse" />
        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-slate-200 dark:bg-slate-700 rounded-full" />
        </div>
        <div className="h-11 w-full bg-slate-200/80 dark:bg-slate-800/80 rounded-2xl animate-pulse" />
      </div>

      {/* Grid Content Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-40 rounded-3xl bg-white dark:bg-[#121622] border border-slate-200/80 dark:border-slate-800 p-5 space-y-3 shadow-2xs animate-pulse">
          <div className="h-4 w-28 bg-slate-200/70 dark:bg-slate-800/60 rounded-md" />
          <div className="h-12 w-full bg-slate-100 dark:bg-slate-800/40 rounded-xl" />
        </div>
        <div className="h-40 rounded-3xl bg-white dark:bg-[#121622] border border-slate-200/80 dark:border-slate-800 p-5 space-y-3 shadow-2xs animate-pulse">
          <div className="h-4 w-28 bg-slate-200/70 dark:bg-slate-800/60 rounded-md" />
          <div className="h-12 w-full bg-slate-100 dark:bg-slate-800/40 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
