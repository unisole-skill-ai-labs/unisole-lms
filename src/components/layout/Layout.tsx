import React, { useEffect, Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import MobileNav from "./MobileNav";
import ChunkErrorBoundary from "../common/ChunkErrorBoundary";
import PageSkeletonFallback from "../common/PageSkeletonFallback";

export default function Layout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const isPlayer = pathname.startsWith("/learn/") || pathname.startsWith("/player/");

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased transition-colors duration-200">
      <Header />
      <main className="flex-1">
        <ChunkErrorBoundary>
          <Suspense fallback={<PageSkeletonFallback />}>
            <Outlet />
          </Suspense>
        </ChunkErrorBoundary>
      </main>
      {!isPlayer && <Footer />}
      {!isPlayer && <MobileNav />}
    </div>
  );
}
