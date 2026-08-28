import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  User,
  Phone,
  BookOpen,
  LogOut,
  Sparkles,
  Compass,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { logout } from "../store/authSlice";
import { useGetMyPathwaysQuery } from "../store/apiSlice";
import Button from "../components/ui/Button";

export default function ProfilePage() {
  const { user } = useSelector((state: any) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { data: myPathways = [] } = useGetMyPathwaysQuery(undefined);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 animate-fade-in">
      {/* Profile Header Card */}
      <div className="p-6 sm:p-8 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl shadow-xl">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              {user.name ? user.name.charAt(0).toUpperCase() : (user.phone ? user.phone.charAt(0) : "S")}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100">{user.name || "Student Learner"}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 text-xs font-bold font-mono">
                  {user.role || "STUDENT"}
                </span>
              </div>

              {user.phone && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400 font-semibold flex items-center justify-center sm:justify-start gap-1.5 font-mono">
                  <Phone className="w-3.5 h-3.5 text-indigo-500" />
                  +91 {user.phone}
                </p>
              )}

              {user.email && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold flex items-center justify-center sm:justify-start gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-500" />
                  {user.email}
                </p>
              )}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={LogOut}
            onClick={handleLogout}
            className="text-rose-600 border-rose-200 dark:border-rose-800 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          >
            Sign Out
          </Button>
        </div>

        {/* Learning Stats Row */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800 text-center">
          <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200/50 dark:border-zinc-850">
            <span className="block text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100">{myPathways.length}</span>
            <span className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-bold uppercase font-mono">Enrolled Pathways</span>
          </div>

          <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200/50 dark:border-zinc-850">
            <span className="block text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">Active</span>
            <span className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-bold uppercase font-mono">Membership Status</span>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/enrolled">
          <div className="p-5 flex items-center justify-between group bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl hover:border-indigo-500/30 transition-all shadow-xs">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  My Enrolled Pathways
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Access video lessons & code notes</p>
              </div>
            </div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">View →</span>
          </div>
        </Link>

        <Link to="/">
          <div className="p-5 flex items-center justify-between group bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl hover:border-purple-500/30 transition-all shadow-xs">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  Explore Catalog
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Discover new career pathways</p>
              </div>
            </div>
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400">Browse →</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
