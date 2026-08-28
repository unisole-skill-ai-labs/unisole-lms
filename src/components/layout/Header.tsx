import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  Compass,
  BookOpen,
  LogOut,
  LogIn,
  UserPlus,
  User,
  Sun,
  Moon,
  Search,
  ChevronDown,
  Sparkles,
  Layers,
  X,
} from "lucide-react";
import { logout } from "../../store/authSlice";
import { useTheme } from "../../context/ThemeContext";
import { useGetPublicPathwaysQuery } from "../../store/apiSlice";
import Button from "../ui/Button";

export default function Header() {
  const { isAuthenticated, user } = useSelector((state: any) => state.auth);
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: pathways = [] } = useGetPublicPathwaysQuery(undefined);

  const navLinks = [
    { name: "Pathways Catalog", path: "/", icon: Compass },
    { name: "My Learning", path: "/enrolled", icon: BookOpen, authRequired: true },
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

  // Quick search shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    setProfileOpen(false);
    setSearchOpen(false);
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

  const filteredSearchResults = pathways
    .filter((p: any) =>
      p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.shortDescription?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .slice(0, 5);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/80 dark:border-zinc-800/80 transition-all shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo & Tag */}
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-3 group">
                <img
                  src="https://res.cloudinary.com/hehmsemf/image/upload/f_auto,q_auto,w_64/v1785299421/Unisole_logo_new_mhqbma.png"
                  alt="Unisole Logo"
                  className="w-8 h-8 rounded-lg object-contain shadow-xs group-hover:scale-105 transition-transform"
                />
                <div className="flex flex-col">
                  <span className="font-extrabold text-base sm:text-lg text-zinc-900 dark:text-zinc-100 tracking-tight leading-none">
                    Unisole <span className="text-indigo-600 dark:text-indigo-400">LMS</span>
                  </span>
                  <span className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mt-0.5 hidden xs:block">
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
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        active
                          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 shadow-xs"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${active ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400 dark:text-zinc-500"}`} />
                      {link.name}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right Controls: Search, Theme Toggle, Auth */}
            <div className="flex items-center gap-2.5">
              {/* Quick Search Shortcut Button */}
              <button
                onClick={() => setSearchOpen(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-800 transition-colors"
                title="Search pathways (Cmd + K)"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="font-medium">Search...</span>
                <kbd className="text-[10px] font-mono bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-1.5 py-0.5 text-zinc-500 dark:text-zinc-400 shadow-xs">
                  ⌘K
                </kbd>
              </button>

              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                aria-label="Toggle Theme"
                className="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
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
                    className="flex items-center gap-2 p-1.5 pr-2.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors border border-zinc-200/80 dark:border-zinc-800"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
                      {user.name ? user.name.charAt(0).toUpperCase() : (user.phone ? user.phone.charAt(0) : "S")}
                    </div>
                    <span className="hidden sm:block text-xs font-bold text-zinc-800 dark:text-zinc-200 max-w-[120px] truncate">
                      {user.name || (user.phone ? `+91 ${user.phone}` : "Student")}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                  </button>

                  {/* Profile Dropdown Menu */}
                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200/80 dark:border-zinc-800 p-1.5 animate-fade-in z-50">
                      <div className="px-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {user.name || "Student Learner"}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate">
                          {user.phone ? `+91 ${user.phone}` : user.email || "Verified Account"}
                        </p>
                        <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold">
                          {user.role || "STUDENT"}
                        </span>
                      </div>

                      <div className="py-1 space-y-0.5">
                        <Link
                          to="/enrolled"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                          <BookOpen className="w-4 h-4 text-indigo-500" />
                          <span>My Enrolled Pathways</span>
                        </Link>
                        <Link
                          to="/profile"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                          <User className="w-4 h-4 text-zinc-400" />
                          <span>Profile & Account</span>
                        </Link>
                      </div>

                      <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login">
                    <Button variant="ghost" size="sm" icon={LogIn}>
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/signup">
                    <Button variant="primary" size="sm" icon={UserPlus}>
                      Sign Up
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Global Quick Search Modal */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && setSearchOpen(false)}
        >
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden">
            <div className="flex items-center px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
              <Search className="w-4 h-4 text-zinc-400 shrink-0 mr-3" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pathways, topics, curriculum..."
                className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden"
              />
              <button
                onClick={() => setSearchOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2 max-h-80 overflow-y-auto">
              {filteredSearchResults.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-400">
                  {searchQuery ? "No pathways found matching your search." : "Type to discover structured AI & engineering pathways."}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredSearchResults.map((pathway: any) => (
                    <Link
                      key={pathway.id}
                      to={`/pathways/${pathway.slug || pathway.id}`}
                      onClick={() => setSearchOpen(false)}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <div className="pr-3">
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          {pathway.title}
                        </h4>
                        <p className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">
                          {pathway.shortDescription || pathway.description}
                        </p>
                      </div>
                      <span className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 shrink-0">
                        {pathway.pricePaise ? `₹${(pathway.pricePaise / 100).toLocaleString("en-IN")}` : "Free"}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
