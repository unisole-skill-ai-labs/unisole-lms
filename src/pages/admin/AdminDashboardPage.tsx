import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  BookOpen,
  ClipboardCheck,
  Users,
  ChevronRight,
  Award,
  CheckCircle2,
  Calendar,
  GraduationCap,
  Clock,
  AlertCircle,
  Inbox,
} from "lucide-react";
import { useGetAdminCoursesQuery } from "../../store/apiSlice";
import { useAdminAnalytics } from "../../hooks/useAdminAnalytics";

export default function AdminDashboardPage() {
  const { user } = useSelector((state: any) => state.auth);

  const userRole = (user?.role || "").toUpperCase();
  const metaRoles: string[] = Array.isArray(user?.metadata?.roles)
    ? user.metadata.roles.map((r: any) => String(r).toUpperCase())
    : [];
  const allRoles = [userRole, ...metaRoles];
  const isAdmin = allRoles.includes("SUPER_ADMIN") || allRoles.includes("ADMIN");
  const isCourseManager =
    isAdmin ||
    allRoles.includes("COURSE_MANAGER") ||
    allRoles.includes("PROGRAM_MANAGER") ||
    allRoles.includes("COURSE_AUTHOR");
  const isMentor = !isCourseManager && allRoles.includes("MENTOR");

  // Course Scope State
  const [selectedCourseId, setSelectedCourseId] = useState<string>("ALL");

  // Shared Admin Analytics Hook
  const {
    summary,
    needsAttention,
    highlightCards,
    isLoading: analyticsLoading,
  } = useAdminAnalytics({
    period: "Monthly",
    courseId: selectedCourseId,
  });

  const { data: courses = [] } = useGetAdminCoursesQuery(undefined);

  if (!isAdmin) {
    if (isCourseManager) {
      return <Navigate to="/admin/courses" replace />;
    }
    if (isMentor) {
      return <Navigate to="/admin/submissions" replace />;
    }
    return <Navigate to="/admin/courses" replace />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto font-sans">
      {/* ------------------------------------------------------------- */}
      {/* Top Header & Course Selector Filter (A7)                       */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Admin Overview
          </h1>
        </div>

        {/* Course Scoping Dropdown (A7: Scopes every metric on page) */}
        <div className="flex items-center gap-2 bg-white dark:bg-[#0B1120] px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs shadow-2xs self-start sm:self-auto">
          <BookOpen className="w-4 h-4 text-purple-600 shrink-0" />
          <span className="text-slate-400 font-semibold">Scope:</span>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Enrolled Courses (Global)</option>
            {courses.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION: "Needs Attention" Operational Alerts (A2)            */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-2.5">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
          <span>Needs Attention</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Students Inactive 7+ Days */}
          <Link
            to="/admin/students?status=AT_RISK"
            className="p-4 rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-600 transition-all shadow-2xs flex items-center justify-between group"
          >
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Inactive 7+ Days</span>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
                {needsAttention.inactive7Days}
              </div>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 mt-1">
                <span>View at-risk students</span>
                <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 stroke-[2.2]" />
            </div>
          </Link>

          {/* Card 2: Pending Submissions Queue */}
          <Link
            to="/admin/submissions"
            className="p-4 rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-600 transition-all shadow-2xs flex items-center justify-between group"
          >
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Review Queue</span>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
                {needsAttention.reviewQueueSize}
              </div>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1 mt-1">
                <span>Pending mentor grading</span>
                <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center shrink-0">
              <Inbox className="w-5 h-5 stroke-[2.2]" />
            </div>
          </Link>

          {/* Card 3: Unassigned Students */}
          <Link
            to="/admin/students?assigned=UNASSIGNED"
            className="p-4 rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-600 transition-all shadow-2xs flex items-center justify-between group"
          >
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Unassigned Learners</span>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
                {needsAttention.unassignedStudents}
              </div>
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1 mt-1">
                <span>Allocate mentors</span>
                <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 stroke-[2.2]" />
            </div>
          </Link>

          {/* Card 4: Overdue Submissions */}
          <Link
            to="/admin/submissions"
            className="p-4 rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 transition-all shadow-2xs flex items-center justify-between group"
          >
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Overdue Lab Reviews</span>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
                {needsAttention.overdueSubmissions}
              </div>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 mt-1">
                <span>Assess submissions</span>
                <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center shrink-0">
              <ClipboardCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
          </Link>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION: Stat Cards with Plain Numbers & Trends (A3)          */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Canonical Enrolled Learners */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold">Enrolled Learners</span>
            <GraduationCap className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
            {summary.enrolledStudents}
          </div>
        </div>

        {/* Card 2: Total Courses */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold">Curriculum Programs</span>
            <BookOpen className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
            {summary.totalCourses}
          </div>
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span>{summary.publishedCourses} published live tracks</span>
          </div>
        </div>

        {/* Card 3: Graded Evaluations */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold">Graded Evaluations</span>
            <Award className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
            {summary.gradedSubmissions}
          </div>
          <div className="text-[11px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
            <span>{summary.pendingSubmissions} in review queue</span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Active Curriculum Programs                                    */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Active Curriculum Programs</h3>
          <Link to="/admin/courses" className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline">
            Manage Courses →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {highlightCards.slice(0, 4).map((c: any) => (
              <Link
                key={c.id}
                to={`/admin/courses/${c.id}`}
                className="p-4 rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 transition-all shadow-2xs space-y-3 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors line-clamp-1">
                      {c.title}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                    {c.tag}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 line-clamp-2">
                  {c.desc}
                </p>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">
                    {c.modulesCount} modules · {c.lessonsCount} lessons
                  </span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    {c.enrollmentsCount} {c.enrollmentsCount === 1 ? "Learner" : "Learners"}
                  </span>
                </div>
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
