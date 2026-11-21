import React, { useState, useEffect } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  LayoutGrid,
  LayoutDashboard,
  BookOpen,
  Calendar,
  Users,
  UserCheck,
  ExternalLink,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { logout } from "../../store/authSlice";
import { useTheme } from "../../context/ThemeContext";

export default function AdminLayout() {
  const { user } = useSelector((state: any) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // E1: Sidebar collapse state with localStorage persistence and tablet auto-collapse
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_sidebar_collapsed");
      if (saved !== null) return saved === "true";
      return window.innerWidth >= 768 && window.innerWidth < 1024;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      // Auto-collapse at tablet widths if no preference is explicitly stored
      if (window.innerWidth < 1024 && window.innerWidth >= 768) {
        const saved = localStorage.getItem("admin_sidebar_collapsed");
        if (saved === null) setIsCollapsed(true);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("admin_sidebar_collapsed", String(next));
      return next;
    });
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const userRole = (user?.role || "").toUpperCase();
  const metaRoles: string[] = Array.isArray(user?.metadata?.roles)
    ? user.metadata.roles.map((r: string) => String(r).toUpperCase())
    : [];
  const allRoles = [userRole, ...metaRoles];

  const isSuperAdmin = allRoles.includes("SUPER_ADMIN");
  const isAdmin = isSuperAdmin || allRoles.includes("ADMIN");
  const isCourseManager =
    isAdmin ||
    allRoles.includes("COURSE_MANAGER") ||
    allRoles.includes("PROGRAM_MANAGER") ||
    allRoles.includes("COURSE_AUTHOR");
  const isMentor = !isCourseManager && allRoles.includes("MENTOR");

  // Build nav items dynamically based on roles (E1: redundant "Courses" badge removed)
  const navItems = [
    ...(isAdmin
      ? [{ name: "Admin Overview", path: "/admin", icon: LayoutGrid, end: true }]
      : []),
    ...(isCourseManager
      ? [{ name: "Course Manager", path: "/admin/courses", icon: BookOpen }]
      : []),
    ...(isMentor && !isCourseManager
      ? [{ name: "Dashboard", path: "/admin/submissions", icon: LayoutDashboard }]
      : []),
    ...(isMentor && !isCourseManager
      ? [{ name: "Student View", path: "/admin/mentor-view", icon: UserCheck }]
      : []),
    { name: "Calendar", path: "/admin/calendar", icon: Calendar },
    ...(isAdmin
      ? [{ name: "Students", path: "/admin/students", icon: Users }]
      : []),
  ];

  const roleLabel = isSuperAdmin
    ? "Super Admin"
    : isAdmin
    ? "Admin"
    : isCourseManager
    ? "Course Manager"
    : isMentor
    ? "Lead Mentor"
    : "Staff Member";

  const userInitial = (user?.name || user?.email || "U").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#070A11] text-slate-800 dark:text-slate-100 flex flex-col md:flex-row antialiased">
      {/* Mobile Topbar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0B1120] sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-sky-500 flex items-center justify-center text-white dark:text-slate-950 font-bold text-sm shadow-sm">
            <LayoutGrid className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">
              Unisole Studio
            </span>
            <span className="ml-2 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              {roleLabel}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Modern Left Sidebar (E1 & E5: Responsive Collapsible Sidebar) */}
      <aside
        className={`${
          mobileMenuOpen ? "block" : "hidden"
        } md:flex flex-col shrink-0 border-r border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0B1120] md:sticky md:top-0 md:h-screen z-30 transition-all duration-300 select-none overflow-y-auto ${
          isCollapsed ? "md:w-20" : "md:w-64"
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 hidden md:flex items-center justify-between">
          <Link
            to={isAdmin ? "/admin" : isCourseManager ? "/admin/courses" : "/admin/submissions"}
            className="flex items-center gap-2.5 group overflow-hidden"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-sky-500 flex items-center justify-center text-white dark:text-slate-950 font-bold text-sm shadow-sm shrink-0 group-hover:scale-105 transition-transform">
              <LayoutGrid className="w-4.5 h-4.5" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 transition-opacity duration-200">
                <div className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight truncate">
                  Unisole Studio
                </div>
                <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">
                  Course CMS & Cockpit
                </div>
              </div>
            )}
          </Link>

          {!isCollapsed && (
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* E1: Rename to "Switch to Student App" */}
        {isAdmin && (
          <div className="px-3 pt-3 pb-1">
            <Link
              to="/enrolled"
              title={isCollapsed ? "Switch to Student App" : undefined}
              className={`flex items-center text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50/70 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 rounded-xl transition-all border border-sky-200/60 dark:border-sky-800/50 group relative ${
                isCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2"
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <ExternalLink className="w-3.5 h-3.5 shrink-0 text-sky-600 dark:text-sky-400" />
                {!isCollapsed && <span className="truncate">Switch to Student App</span>}
              </span>
              {!isCollapsed && (
                <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold shrink-0">
                  Open
                </span>
              )}
              {isCollapsed && (
                <span className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-semibold rounded-lg shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  Switch to Student App
                </span>
              )}
            </Link>
          </div>
        )}

        {/* Main Navigation Links with Tooltips (E1) */}
        <nav className="px-2.5 py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={() => setMobileMenuOpen(false)}
                title={isCollapsed ? item.name : undefined}
                className={({ isActive }) =>
                  `flex items-center rounded-xl transition-all group relative ${
                    isCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5 text-xs font-semibold"
                  } ${
                    isActive
                      ? "bg-slate-100 text-slate-900 dark:bg-sky-500/15 dark:text-sky-400 shadow-2xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100"
                  }`
                }
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className="w-4 h-4 stroke-[2] shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                </div>

                {/* Floating Tooltip when collapsed */}
                {isCollapsed && (
                  <span className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-semibold rounded-lg shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                    {item.name}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="flex-1" />

        {/* E1: Collapse / Expand Button */}
        <div className="p-2.5 border-t border-slate-100 dark:border-slate-800/80 hidden md:block">
          <button
            onClick={toggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="w-full flex items-center justify-center p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <div className="flex items-center gap-2 text-xs font-semibold">
                <ChevronLeft className="w-4 h-4" />
                <span>Collapse Sidebar</span>
              </div>
            )}
          </button>
        </div>

        {/* User Info & Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/80">
          <div
            className={`flex items-center justify-between ${
              isCollapsed ? "flex-col gap-2 p-1" : "px-3 py-2"
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold text-xs flex items-center justify-center shrink-0">
                {userInitial}
              </div>
              {!isCollapsed && (
                <div className="truncate">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {user?.name || "Alesia K."}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">
                    {roleLabel}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 min-h-screen overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
