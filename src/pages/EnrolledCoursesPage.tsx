import React from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { BookOpen, Award, CheckCircle2, TrendingUp, Sparkles, Compass, Play, ArrowRight, Layers } from "lucide-react";
import { useGetMyPathwaysQuery } from "../store/apiSlice";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Spinner from "../components/ui/Spinner";
import Button from "../components/ui/Button";

export default function EnrolledCoursesPage() {
  const { user } = useSelector((state: any) => state.auth);
  const { data: myPathways = [], isLoading } = useGetMyPathwaysQuery(undefined);

  const totalEnrolled = myPathways.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
            My Learning Pathways
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">
            Access your enrolled curriculums, modular tracks, and video lessons
          </p>
        </div>

        <Link to="/">
          <Button variant="outline" size="sm" icon={Compass}>
            Explore More Pathways
          </Button>
        </Link>
      </div>

      {/* Progress Metric Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
        <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1.5">
            <BookOpen className="w-4 h-4" />
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">
              Enrolled Tracks
            </span>
          </div>
          <span className="text-xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100">{totalEnrolled}</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">
              Access Status
            </span>
          </div>
          <span className="text-xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">Active</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1.5">
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">
              Account Role
            </span>
          </div>
          <span className="text-xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100">{user?.role || "STUDENT"}</span>
        </div>
      </div>

      {/* Enrolled Pathways Grid */}
      {isLoading ? (
        <div className="py-16 text-center">
          <Spinner label="Loading your enrolled pathways..." size="lg" />
        </div>
      ) : totalEnrolled === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 p-12 text-center space-y-4 max-w-md mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">No active enrollments yet</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            You haven't enrolled in any learning pathways yet. Browse our curated catalog to start learning!
          </p>
          <Link to="/">
            <Button variant="primary" size="md" icon={Compass}>
              Browse Pathways Catalog
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {myPathways.map((item: any) => {
            const pathway = item.pathway;
            if (!pathway) return null;

            return (
              <div
                key={item.enrollmentId || pathway.id}
                className="minimal-card p-6 flex flex-col justify-between h-full group bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="emerald" size="sm" className="gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </Badge>
                    <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 font-mono">
                      {item.enrolledAt ? new Date(item.enrolledAt).toLocaleDateString("en-IN") : "Enrolled"}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {pathway.title}
                  </h3>

                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                    {pathway.shortDescription || pathway.description || "Comprehensive modular learning curriculum."}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    Full Access
                  </span>

                  <Link to={`/learn/${pathway.id}`}>
                    <Button size="sm" variant="primary" icon={Play}>
                      Continue Learning
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
