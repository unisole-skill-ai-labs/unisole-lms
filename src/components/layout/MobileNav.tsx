import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { LayoutDashboard, BookOpen, User, LogIn } from "lucide-react";

export default function MobileNav() {
  const { isAuthenticated } = useSelector((state: any) => state.auth);
  const location = useLocation();

  const tabs = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "My Learning", path: "/enrolled", icon: BookOpen, authOnly: true },
    {
      name: isAuthenticated ? "Profile" : "Login",
      path: isAuthenticated ? "/profile" : "/login",
      icon: isAuthenticated ? User : LogIn,
    },
  ];

  const isActive = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="md:hidden fixed bottom-3 left-3 right-3 z-40 max-w-sm mx-auto pointer-events-none safe-area-bottom">
      <div className="macos-dock rounded-2xl p-1.5 pointer-events-auto flex items-center justify-around shadow-xl">
        {tabs.map((tab) => {
          if (tab.authOnly && !isAuthenticated) return null;
          const Icon = tab.icon;
          const active = isActive(tab.path);

          return (
            <Link
              key={tab.name}
              to={tab.path}
              className={`relative flex flex-col items-center justify-center py-1 px-3 min-w-[64px] min-h-[46px] rounded-xl transition-all duration-200 cursor-pointer active:scale-95 ${
                active
                  ? "text-blue-600 dark:text-blue-400 font-bold"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium"
              }`}
            >
              <div
                className={`p-1 rounded-xl transition-all duration-200 ${
                  active ? "bg-blue-50 dark:bg-blue-950/70 shadow-2xs scale-105" : "bg-transparent"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "stroke-[2.2]" : "stroke-[1.75]"}`} />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">{tab.name}</span>

              {/* macOS Active App Indicator Dot under active icon */}
              {active && (
                <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
