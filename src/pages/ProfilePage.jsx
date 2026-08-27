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
} from "lucide-react";
import { logout } from "../store/authSlice";
import { useGetMyPathwaysQuery } from "../store/apiSlice";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

export default function ProfilePage() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { data: myPathways = [] } = useGetMyPathwaysQuery();

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
      <Card className="p-6 sm:p-8 bg-white border-slate-200/80 shadow-md">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
              {user.name ? user.name.charAt(0).toUpperCase() : (user.phone ? user.phone.charAt(0) : "S")}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">{user.name || "Student Learner"}</h1>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">
                  {user.role || "STUDENT"}
                </span>
              </div>

              {user.phone && (
                <p className="text-xs text-slate-600 font-semibold flex items-center justify-center sm:justify-start gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-indigo-500" />
                  +91 {user.phone}
                </p>
              )}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={LogOut}
            onClick={handleLogout}
            className="text-rose-600 border-rose-200 hover:bg-rose-50"
          >
            Sign Out
          </Button>
        </div>

        {/* Learning Stats Row */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-8 pt-6 border-t border-slate-100 text-center">
          <div className="p-3.5 bg-slate-50 rounded-2xl">
            <span className="block text-xl sm:text-2xl font-black text-slate-900">{myPathways.length}</span>
            <span className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase">Enrolled Pathways</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl">
            <span className="block text-xl sm:text-2xl font-black text-emerald-600">Active</span>
            <span className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase">Membership Status</span>
          </div>
        </div>
      </Card>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/enrolled">
          <Card hover className="p-5 flex items-center justify-between group bg-white border-slate-200/80">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                  My Enrolled Pathways
                </h3>
                <p className="text-xs text-slate-500">Access video lessons & study material</p>
              </div>
            </div>
            <span className="text-xs font-bold text-indigo-600">View →</span>
          </Card>
        </Link>

        <Link to="/">
          <Card hover className="p-5 flex items-center justify-between group bg-white border-slate-200/80">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 group-hover:text-purple-600 transition-colors">
                  Explore Catalog
                </h3>
                <p className="text-xs text-slate-500">Discover new career pathways</p>
              </div>
            </div>
            <span className="text-xs font-bold text-purple-600">Browse →</span>
          </Card>
        </Link>
      </div>
    </div>
  );
}
