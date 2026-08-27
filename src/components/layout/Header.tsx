import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  Compass,
  BookOpen,
  LogOut,
  LogIn,
  UserPlus,
  Sparkles,
} from "lucide-react";
import { logout } from "../../store/authSlice";
import Button from "../ui/Button";

export default function Header() {
  const { isAuthenticated, user } = useSelector((state: any) => state.auth);
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = [
    { name: "Pathways Catalog", path: "/", icon: Compass },
    { name: "My Learning", path: "/enrolled", icon: BookOpen, authRequired: true },
  ];

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const isActive = (path) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src="/unisole-logo.jpg"
              alt="Unisole Logo"
              className="w-10 h-10 rounded-full object-cover shadow-sm ring-1 ring-slate-200 group-hover:scale-105 transition-transform"
            />
            <div className="flex flex-col">
              <span className="font-extrabold text-lg text-slate-900 tracking-tight">
                Unisole LMS
              </span>
              <span className="text-[10px] font-medium text-slate-400 -mt-1 hidden xs:block">
                Flowers of the Sky
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              if (link.authRequired && !isAuthenticated) return null;
              const Icon = link.icon;
              const active = isActive(link.path);
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    active
                      ? "bg-indigo-50 text-indigo-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? "text-indigo-600" : "text-slate-400"}`} />
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* User Profile / Auth Actions */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/profile"
                  className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {user.name ? user.name.charAt(0).toUpperCase() : (user.phone ? user.phone.charAt(0) : "S")}
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-800 leading-tight">
                      {user.name || (user.phone ? `+91 ${user.phone}` : "Student")}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {user.role || "STUDENT"}
                    </span>
                  </div>
                </Link>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  title="Logout"
                  className="text-slate-400 hover:text-rose-600"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
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
  );
}
