import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, BookOpen, Activity, Calendar } from "lucide-react";

export default function MobileNav() {
  const location = useLocation();

  const tabs = [
    { name: "Home", path: "/", icon: Home },
    { name: "Courses", path: "/enrolled", icon: BookOpen },
    { name: "Activities", path: "/activities", icon: Activity },
    { name: "Calendar", path: "/calendar", icon: Calendar },
  ];

  const isActive = (path: string) => {
    if (path === "/" && (location.pathname === "/" || location.pathname === "/dashboard")) return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-200/80 dark:border-zinc-800/80 pb-[env(safe-area-inset-bottom,0px)] shadow-lg"
    >
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.path);

          return (
            <Link
              key={tab.name}
              to={tab.path}
              className={`flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 rounded-xl transition-all duration-150 cursor-pointer active:scale-95 ${
                active
                  ? "text-blue-600 dark:text-blue-400 font-bold"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium"
              }`}
            >
              <div
                className={`p-1 rounded-xl transition-all duration-150 ${
                  active ? "bg-blue-50 dark:bg-blue-950/70 scale-105" : "bg-transparent"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "stroke-[2.2]" : "stroke-[1.8]"}`} />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 leading-none">{tab.name}</span>
              {active && (
                <span className="w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400 mt-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
