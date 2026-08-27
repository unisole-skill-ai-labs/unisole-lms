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
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            My Learning Pathways
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Access your purchased curriculums, courses, and interactive video lessons
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
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-indigo-600 mb-1.5">
            <BookOpen className="w-4 h-4" />
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
              Enrolled Pathways
            </span>
          </div>
          <span className="text-xl sm:text-3xl font-black text-slate-900">{totalEnrolled}</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-600 mb-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
              Access Status
            </span>
          </div>
          <span className="text-xl sm:text-3xl font-black text-emerald-600">Active</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 text-purple-600 mb-1.5">
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
              Role
            </span>
          </div>
          <span className="text-xl sm:text-3xl font-black text-slate-900">{user?.role || "STUDENT"}</span>
        </div>
      </div>

      {/* Enrolled Pathways Grid */}
      {isLoading ? (
        <Spinner label="Loading your enrolled pathways..." size="lg" />
      ) : totalEnrolled === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-4 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No active enrollments yet</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
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
          {myPathways.map((item) => {
            const pathway = item.pathway;
            if (!pathway) return null;

            return (
              <Card key={item.enrollmentId || pathway.id} hover className="p-6 flex flex-col justify-between h-full group bg-white border-slate-200/80">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="emerald" size="sm">
                      Active
                    </Badge>
                    <span className="text-[11px] font-medium text-slate-400">
                      {item.enrolledAt ? new Date(item.enrolledAt).toLocaleDateString("en-IN") : "Enrolled"}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-base text-slate-900 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
                    {pathway.title}
                  </h3>

                  <p className="mt-2 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {pathway.shortDescription || pathway.description || "Comprehensive modular learning curriculum."}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    Full Curriculum
                  </span>

                  <Link to={`/learn/${pathway.id}`}>
                    <Button size="sm" variant="primary" icon={Play}>
                      Continue Learning
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
