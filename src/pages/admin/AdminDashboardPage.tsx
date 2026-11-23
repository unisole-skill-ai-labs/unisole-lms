import React, { useState, useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  BookOpen,
  ClipboardCheck,
  FolderArchive,
  Users,
  ChevronRight,
  ArrowUpRight,
  FileText,
  Layers,
  Award,
  Sparkles,
  CheckCircle2,
  Calendar,
  GraduationCap,
  Clock,
  AlertTriangle,
  AlertCircle,
  Inbox,
  TrendingUp,
  Activity,
  Code2,
  Video,
} from "lucide-react";
import {
  useGetAdminCoursesQuery,
  useGetAdminLessonsQuery,
} from "../../store/apiSlice";
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

  if (!isAdmin) {
    if (isCourseManager) {
      return <Navigate to="/admin/courses" replace />;
    }
    if (isMentor) {
      return <Navigate to="/admin/submissions" replace />;
    }
    return <Navigate to="/admin/courses" replace />;
  }

  // Course Scope & Velocity Period States (A7, A4)
  const [selectedCourseId, setSelectedCourseId] = useState<string>("ALL");
  const [velocityPeriod, setVelocityPeriod] = useState<"Weekly" | "Monthly" | "Yearly">("Monthly");
  const [hoveredPoint, setHoveredPoint] = useState<{ dayLabel: string; dateKey: string; count: number; x: number; y: number } | null>(null);

  // Shared Admin Analytics Hook (Canonical Source of Truth, Parts A1 & F)
  const {
    summary,
    needsAttention,
    funnel,
    benchmarks,
    highlightCards,
    velocity,
    isLoading: analyticsLoading,
  } = useAdminAnalytics({
    period: velocityPeriod,
    courseId: selectedCourseId,
  });

  const { data: courses = [] } = useGetAdminCoursesQuery(undefined);

  // Y-Axis Ticks (Whole numbers only, no duplicate labels) (A4)
  const velocityData = velocity?.data || [];
  const counts = velocityData.map((d: any) => d.count);
  const rawMaxCount = Math.max(1, ...counts);
  const maxCount = Math.max(4, Math.ceil(rawMaxCount));

  const yTicks = useMemo(() => {
    const t4 = maxCount;
    const t3 = Math.round(maxCount * 0.75);
    const t2 = Math.round(maxCount * 0.5);
    const t1 = Math.round(maxCount * 0.25);
    const t0 = 0;
    // Deduplicate while preserving descending order
    return Array.from(new Set([t4, t3, t2, t1, t0]));
  }, [maxCount]);

  // Construct Area & Line SVG Paths with Hover Points (A4)
  const { areaPath, linePath, chartPoints, xLabels } = useMemo(() => {
    if (velocityData.length === 0) {
      return { areaPath: "", linePath: "", chartPoints: [], xLabels: [] };
    }

    const len = velocityData.length;
    const points = velocityData.map((d: any, i: number) => {
      const x = len > 1 ? (i / (len - 1)) * 600 : 300;
      const y = maxCount > 0 ? 180 - (d.count / maxCount) * 140 : 180;
      return { x, y, data: d };
    });

    const lPath =
      points.length > 0
        ? points.reduce((acc: string, curr: any, i: number) => {
            if (i === 0) return `M ${curr.x} ${curr.y}`;
            const prev = points[i - 1];
            const cpX = (prev.x + curr.x) / 2;
            return `${acc} C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
          }, "")
        : "";

    const aPath =
      points.length > 0
        ? `${lPath} L ${points[points.length - 1].x} 190 L ${points[0].x} 190 Z`
        : "";

    const stride = Math.max(1, Math.floor(len / 6));
    const labels: string[] = [];
    for (let i = 0; i < len; i += stride) {
      labels.push(velocityData[i].dayLabel);
    }
    if (labels[labels.length - 1] !== velocityData[len - 1].dayLabel) {
      labels.push(velocityData[len - 1].dayLabel);
    }

    return { areaPath: aPath, linePath: lPath, chartPoints: points, xLabels: labels };
  }, [velocityData, maxCount]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto font-sans">
      {/* ------------------------------------------------------------- */}
      {/* Top Header & Course Selector Filter (A7)                       */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Admin Overview
            </h1>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/60">
              Live Cockpit
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Canonical platform operations, student completion funnel & academic velocity.
          </p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Canonical Enrolled Learners */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold">Enrolled Learners</span>
            <GraduationCap className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
            {summary.enrolledStudents}
          </div>
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{funnel.activePct}% active in coursework</span>
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

        {/* Card 3: Total Lessons */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold">Total Lessons & Modules</span>
            <Layers className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
            {summary.totalLessons}
          </div>
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span>{summary.totalModules} modules across tracks</span>
          </div>
        </div>

        {/* Card 4: Graded Evaluations */}
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
      {/* ROW: Learning Velocity Chart + Horizontal Progress Funnel      */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Learning Velocity Chart (A4: whole numbers, hover tooltip) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#0B1120] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Learning Velocity
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Completed student activities & submissions over time
              </p>
            </div>

            {/* Velocity Period Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl text-xs font-semibold">
              {(["Weekly", "Monthly", "Yearly"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setVelocityPeriod(tab)}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    velocityPeriod === tab
                      ? "bg-white dark:bg-purple-600 text-purple-700 dark:text-white font-bold shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Chart Area */}
          <div className="relative pt-6 pb-2 min-h-[240px] flex">
            {/* Y-Axis Ticks (Whole numbers only, no duplicate labels) (A4) */}
            <div className="flex flex-col justify-between text-[11px] text-slate-400 font-mono pr-3 select-none pb-6">
              {yTicks.map((tick, i) => (
                <span key={i}>{tick}</span>
              ))}
            </div>

            {/* SVG Curve */}
            <div className="flex-1 relative flex flex-col justify-between">
              {/* Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 opacity-30">
                {yTicks.map((_, i) => (
                  <div key={i} className="border-b border-slate-200 dark:border-slate-800 border-dashed w-full" />
                ))}
              </div>

              <div className="relative h-[190px] w-full">
                <svg viewBox="0 0 600 200" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="velocityGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#9333EA" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#9333EA" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  <path d={areaPath} fill="url(#velocityGrad)" />
                  <path d={linePath} fill="none" stroke="#9333EA" strokeWidth="2.5" strokeLinecap="round" />

                  {/* Interactive Points on Curve with Tooltips (A4) */}
                  {chartPoints.map((pt: any, i: number) => (
                    <circle
                      key={i}
                      cx={pt.x}
                      cy={pt.y}
                      r={hoveredPoint?.dateKey === pt.data.dateKey ? "5" : "3"}
                      className="fill-purple-600 hover:fill-purple-400 transition-all cursor-pointer"
                      onMouseEnter={() =>
                        setHoveredPoint({
                          dayLabel: pt.data.dayLabel,
                          dateKey: pt.data.dateKey,
                          count: pt.data.count,
                          x: pt.x,
                          y: pt.y,
                        })
                      }
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  ))}
                </svg>

                {/* Floating Tooltip (A4) */}
                {hoveredPoint && (
                  <div
                    className="absolute z-20 pointer-events-none px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-bold shadow-lg -translate-x-1/2 -translate-y-8"
                    style={{ left: `${(hoveredPoint.x / 600) * 100}%`, top: `${hoveredPoint.y}px` }}
                  >
                    <span>{hoveredPoint.dayLabel}: </span>
                    <span className="text-purple-300 font-mono">{hoveredPoint.count} activities</span>
                  </div>
                )}
              </div>

              {/* X-Axis Labels */}
              <div className="flex justify-between text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-100 dark:border-slate-800">
                {xLabels.map((lbl: string, i: number) => (
                  <span key={i}>{lbl}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Horizontal Progress Funnel (A5) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#0B1120] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Progress Funnel
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Learner stage drop-off & progression rates
            </p>
          </div>

          {/* Horizontal Funnel Steps (A5) */}
          <div className="py-3 space-y-3.5">
            {/* Step 1: Enrolled */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200">1. Enrolled</span>
                <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                  {funnel.enrolled} (100%)
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                <div className="h-full bg-purple-600 rounded-lg" style={{ width: "100%" }} />
              </div>
            </div>

            {/* Drop-off tag 1 */}
            <div className="flex justify-end pr-1 text-[10px] text-rose-500 font-semibold">
              ↓ Drop-off: {funnel.dropOff?.enrolledToActive || 0} ({funnel.dropOff?.enrolledToActivePct || 0}%)
            </div>

            {/* Step 2: Started Modules */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200">2. Started Modules</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  {funnel.activeLearners} ({funnel.activePct}%)
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                <div className="h-full bg-rose-500 rounded-lg" style={{ width: `${funnel.activePct}%` }} />
              </div>
            </div>

            {/* Drop-off tag 2 */}
            <div className="flex justify-end pr-1 text-[10px] text-rose-500 font-semibold">
              ↓ Drop-off: {funnel.dropOff?.activeToAssessed || 0} ({funnel.dropOff?.activeToAssessedPct || 0}%)
            </div>

            {/* Step 3: Assessments Cleared */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200">3. Assessments Cleared</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {funnel.assessed} ({funnel.assessedPct}%)
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                <div className="h-full bg-amber-500 rounded-lg" style={{ width: `${funnel.assessedPct}%` }} />
              </div>
            </div>

            {/* Drop-off tag 3 */}
            <div className="flex justify-end pr-1 text-[10px] text-rose-500 font-semibold">
              ↓ Drop-off: {funnel.dropOff?.assessedToCertified || 0} ({funnel.dropOff?.assessedToCertifiedPct || 0}%)
            </div>

            {/* Step 4: Certified / Graduated */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200">4. Certified / Graduated</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {funnel.certified} ({funnel.certifiedPct}%)
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-lg" style={{ width: `${funnel.certifiedPct}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ROW: Academic Benchmarks (A6) & Course Cards (A8)             */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Academic Benchmarks with Clean Empty State (A6) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#0B1120] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Academic Benchmarks</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Evaluation performance across tests & vivas</p>
            </div>
            <Award className="w-4 h-4 text-purple-500" />
          </div>

          {benchmarks.totalEvaluations > 0 ? (
            <div className="grid grid-cols-2 gap-3.5">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070A11] border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400 font-medium">Avg Test Score</span>
                <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
                  {benchmarks.avgScore}%
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070A11] border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400 font-medium">Viva Pass Rate</span>
                <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
                  {benchmarks.vivaTotal > 0 ? `${benchmarks.vivaPassRate}%` : "—"}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070A11] border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400 font-medium">Coding Pass Rate</span>
                <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
                  {benchmarks.codingTotal > 0 ? `${benchmarks.codingPassRate}%` : "—"}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070A11] border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400 font-medium">Avg Turnaround</span>
                <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
                  {benchmarks.avgTurnaroundHours} hrs
                </div>
              </div>
            </div>
          ) : (
            // Clean Empty State (A6)
            <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
              <Award className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-500">
                No evaluations recorded yet for this cohort.
              </p>
              <p className="text-[11px] text-slate-400">
                Academic score diagnostics appear once student tests or projects are graded.
              </p>
            </div>
          )}
        </div>

        {/* Right: Real Course Cards with Modules, Lessons & Enrolled Counts (A8) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Active Curriculum Programs</h3>
            <Link to="/admin/courses" className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline">
              Manage Courses →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
    </div>
  );
}
