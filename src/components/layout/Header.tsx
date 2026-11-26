import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  LayoutDashboard,
  Compass,
  BookOpen,
  LogOut,
  LogIn,
  User,
  Sun,
  Moon,
  ChevronDown,
  Sparkles,
  Layers,
  X,
  Menu,
  Newspaper,
  CheckCircle2,
  Bell,
} from "lucide-react";
import { logout } from "../../store/authSlice";
import { useTheme } from "../../context/ThemeContext";
import { useGetStudentActivitiesQuery } from "../../store/apiSlice";
import Button from "../ui/Button";
import LearnerDrawer from "./LearnerDrawer";
import { prefetchByPath, getPrefetchHandlers } from "../../utils/routePrefetch";

export default function Header() {
  const { isAuthenticated, user } = useSelector((state: any) => state.auth);
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [profileOpen, setProfileOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: activitiesData } = useGetStudentActivitiesQuery(undefined, {
    skip: !isAuthenticated,
  });

  const unreadCount = new Set([
    ...(activitiesData?.newItems || []).map((i: any) => i.lessonId || i.id),
    ...(activitiesData?.missed || []).map((i: any) => i.lessonId || i.id),
    ...(activitiesData?.upcoming?.filter((u: any) => u.isToday || u.isUrgent) || []).map((i: any) => i.lessonId || i.id),
  ]).size;

  const navLinks = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Courses", path: "/enrolled", icon: BookOpen, authRequired: true },
  ];

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcuts (Escape closes drawer)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    setProfileOpen(false);
    setDrawerOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setProfileOpen(false);
    dispatch(logout());
    navigate("/login");
  };

  const isActive = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white dark:bg-zinc-950 border-b border-zinc-200/80 dark:border-zinc-800/80 transition-all shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Mobile Drawer Trigger + Brand Logo */}
            <div className="flex items-center gap-3 sm:gap-6">
              {/* Mobile Drawer Trigger (Hamburger) */}
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open learner navigation drawer"
                aria-controls="learner-navigation-drawer"
                aria-expanded={drawerOpen}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <Menu className="w-5 h-5 stroke-[2]" />
              </button>

              <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group">
                <img
                  src="https://res.cloudinary.com/hehmsemf/image/upload/f_auto,q_auto,w_64/v1785299421/Unisole_logo_new_mhqbma.png"
                  alt="Unisole Logo"
                  className="w-8 h-8 rounded-lg object-contain shadow-xs"
                />
                <div className="flex flex-col">
                  <span className="font-extrabold text-base sm:text-lg text-zinc-900 dark:text-zinc-100 tracking-tight leading-none">
                    Unisole <span className="text-blue-600 dark:text-blue-400">LMS</span>
                  </span>
                  <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mt-0.5 hidden xs:block">
                    Skill AI Labs
                  </span>
                </div>
              </Link>

              {/* Desktop Nav Links */}
              <nav className="hidden md:flex items-center gap-1">
                {navLinks.map((link) => {
                  if (link.authRequired && !isAuthenticated) return null;
                  const Icon = link.icon;
                  const active = isActive(link.path);
                  return (
                    <Link
                      key={link.name}
                      to={link.path}
                      {...getPrefetchHandlers(link.path)}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        active
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 shadow-xs"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${active ? "text-blue-600 dark:text-blue-400" : "text-zinc-400 dark:text-zinc-500"}`} />
                      {link.name}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right Controls: Notifications Bell, Theme Toggle, Auth */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Notifications Bell Icon */}
              {isAuthenticated && (
                <Link
                  to="/notifications"
                  {...getPrefetchHandlers("/notifications")}
                  aria-label="Notifications"
                  className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-zinc-950" />
                  )}
                </Link>
              )}

              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                aria-label="Toggle Theme"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-zinc-600" />
                )}
              </button>

              {/* User State */}
              {isAuthenticated && user ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setProfileOpen((prev) => !prev)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center p-0.5 rounded-full hover:ring-2 hover:ring-blue-500/30 transition-all cursor-pointer"
                    aria-label="User Profile Menu"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-sky-500 flex items-center justify-center text-white text-xs font-bold shadow-xs overflow-hidden border border-zinc-200/80 dark:border-zinc-700">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name || "Avatar"} className="w-full h-full object-cover" />
                      ) : (
                        user.name ? user.name.charAt(0).toUpperCase() : (user.phone ? user.phone.charAt(0) : "S")
                      )}
                    </div>
                  </button>

                  {/* Profile Dropdown Menu */}
                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-white dark:bg-[#121622] rounded-2xl shadow-xl border border-zinc-200/90 dark:border-zinc-800 p-3 z-50">
                      {/* User Header */}
                      <div className="flex items-center gap-3 pb-3 mb-2 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-sky-500 flex items-center justify-center text-white text-sm font-bold shadow-xs shrink-0 overflow-hidden">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name || "Avatar"} className="w-full h-full object-cover" />
                          ) : (
                            user.name ? user.name.charAt(0).toUpperCase() : (user.phone ? user.phone.charAt(0) : "S")
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                            {user.name || "Student"}
                          </p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate">
                            {user.email || (user.phone ? (user.phone.startsWith("+91") ? user.phone : `+91 ${user.phone}`) : "learner@unisole.org")}
                          </p>
                        </div>
                      </div>

                      {/* Menu List */}
                      <div className="space-y-0.5">
                        {/* 1. Profile */}
                        <Link
                          to="/profile"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
                        >
                          <User className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0 stroke-[2]" />
                          <span>Profile</span>
                        </Link>

                        {/* 3. Industry Articles */}
                        <Link
                          to="/articles"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
                        >
                          <Newspaper className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0 stroke-[2]" />
                          <span>Industry Articles</span>
                        </Link>

                        {/* Admin Studio & CMS (if privileged role) */}
                        {["ADMIN", "SUPER_ADMIN", "MENTOR", "MEMBER"].includes(user?.role) && (
                          <Link
                            to="/admin"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50/80 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors border border-blue-200/50 dark:border-blue-800/50"
                          >
                            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 stroke-[2]" />
                            <span>Course Studio & CMS</span>
                          </Link>
                        )}

                        {/* 5. Logout */}
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/70 dark:hover:bg-rose-950/30 transition-colors text-left cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0 stroke-[2]" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center">
                  <Link to="/login">
                    <Button variant="primary" size="sm" icon={LogIn}>
                      Login / Register
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile-First Navigation Drawer */}
      <LearnerDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
