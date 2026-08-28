import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import MobileNav from "./MobileNav";

export default function Layout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const isPlayer = pathname.startsWith("/learn/");

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased transition-colors duration-200">
      <Header />
      <main className={`flex-1 ${isPlayer ? "" : "pb-16 md:pb-0"}`}>
        <Outlet />
      </main>
      {!isPlayer && <Footer />}
      {!isPlayer && <MobileNav />}
    </div>
  );
}
