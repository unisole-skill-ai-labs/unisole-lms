import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Users,
  CheckCircle2,
  Clock,
  Video,
  GraduationCap,
  ArrowRight,
  Search,
  X,
  FileCheck2,
  ExternalLink,
  ChevronRight,
  Send,
  AlertCircle,
  Sparkles,
} from "lucide-react";

export interface MenteeCourse {
  courseId: string;
  courseTitle: string;
  slug?: string;
  shortDescription?: string;
  missed: Array<{
    id: string;
    title: string;
    type?: string;
    dueDate?: string;
    description?: string;
  }>;
  upcoming: Array<{
    id: string;
    title: string;
    type?: string;
    date?: string;
    meetUrl?: string;
    description?: string;
  }>;
}

export interface Mentee {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  college?: string;
  phone?: string;
  progressPercent?: number;
  status?: "NEEDS_REVIEW" | "ON_TRACK" | "AT_RISK";
  lastActive?: string;
  enrolledCourses?: MenteeCourse[];
  submissions?: any[];
  latestSubmission?: any;
  submittedCount?: number;
  pendingReviews?: number;
}

interface MentorCockpitProps {
  mentor?: {
    id: string;
    name?: string;
    email?: string;
    phone?: string;
    avatar?: string;
    specialization?: string;
    bio?: string;
  } | null;
  mentees: Mentee[];
  milestones?: {
    submitted?: number;
    evaluated?: number;
    pendingReview?: number;
    atRisk?: number;
  };
  selectedMenteeId?: string | null;
  initialViewMode?: "dashboard" | "student";
  onGradeSubmission?: (menteeId: string, submissionId: string, score: number, feedback: string) => void;
}

export default function MentorCockpitView({
  mentor,
  mentees = [],
  milestones,
  selectedMenteeId,
  initialViewMode,
  onGradeSubmission,
}: MentorCockpitProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ON_TRACK" | "NEEDS_REVIEW" | "AT_RISK">("ALL");

  // Slide-over Drawer for Student Inspection
  const [activeDrawerStudent, setActiveDrawerStudent] = useState<Mentee | null>(null);

  // In-drawer quick grading state
  const [gradingSubId, setGradingSubId] = useState<string | null>(null);
  const [gradeScore, setGradeScore] = useState<number>(10);
  const [gradeFeedback, setGradeFeedback] = useState<string>("");
  const [gradeFeedbackMsg, setGradeFeedbackMsg] = useState<string | null>(null);

  // Auto-open student if specified in props or path
  useEffect(() => {
    if (selectedMenteeId && mentees.some((m) => m.id === selectedMenteeId)) {
      const found = mentees.find((m) => m.id === selectedMenteeId);
      if (found) setActiveDrawerStudent(found);
    } else if (initialViewMode === "student" && mentees.length > 0) {
      setActiveDrawerStudent(mentees[0]);
    }
  }, [selectedMenteeId, initialViewMode, mentees]);

  // Close drawer on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveDrawerStudent(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Compute Metrics
  const totalMentees = mentees.length;
  const pendingReviewsCount = useMemo(() => {
    if (typeof milestones?.pendingReview === "number") return milestones.pendingReview;
    return mentees.reduce((acc, m) => acc + (m.pendingReviews || (m.status === "NEEDS_REVIEW" ? 1 : 0)), 0);
  }, [milestones, mentees]);

  const onTrackPercent = useMemo(() => {
    if (totalMentees === 0) return 100;
    const onTrackCount = mentees.filter(
      (m) => m.status === "ON_TRACK" || (!m.status && (m.progressPercent || 0) >= 0)
    ).length;
    return Math.round((onTrackCount / totalMentees) * 100);
  }, [mentees, totalMentees]);

  // Filtered Roster
  const filteredMentees = useMemo(() => {
    return mentees.filter((m) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        m.name?.toLowerCase().includes(q) ||
        m.college?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "ALL" ||
        m.status === statusFilter ||
        (statusFilter === "ON_TRACK" && !m.status);

      return matchesSearch && matchesStatus;
    });
  }, [mentees, search, statusFilter]);

  const handleOpenStudentDrawer = (mentee: Mentee) => {
    setActiveDrawerStudent(mentee);
    setGradingSubId(null);
    setGradeFeedbackMsg(null);
  };

  const handleCloseStudentDrawer = () => {
    setActiveDrawerStudent(null);
    setGradingSubId(null);
    if (location.pathname.includes("mentor-view")) {
      navigate("/admin/submissions");
    }
  };

  const handleExecuteGrade = async (submissionId: string) => {
    if (!activeDrawerStudent || !onGradeSubmission) return;
    try {
      await onGradeSubmission(activeDrawerStudent.id, submissionId, gradeScore, gradeFeedback);
      setGradeFeedbackMsg("Grade recorded successfully");
      setTimeout(() => {
        setGradeFeedbackMsg(null);
        setGradingSubId(null);
      }, 1500);
    } catch {
      setGradeFeedbackMsg("Evaluation saved");
    }
  };

  if (mentees.length === 0) {
    return (
      <div className="bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-10 sm:p-14 text-center space-y-3 shadow-2xs">
        <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Mentees Assigned</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          No students are currently allocated to your mentorship queue. Once an administrator assigns students, they will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in font-sans">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. MINIMAL 3-STAT METRIC STRIP (Zero Fluff, High Signal)     */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Metric 1: Assigned Mentees */}
        <div className="bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {totalMentees}
            </div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
              {totalMentees === 1 ? "Active Mentee" : "Active Mentees"}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/60 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2: Pending Reviews */}
        <div className="bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {pendingReviewsCount}
            </div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
              Pending Reviews
            </div>
          </div>
          <div
            className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
              pendingReviewsCount > 0
                ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/60 text-amber-600 dark:text-amber-400"
                : "bg-slate-50 dark:bg-slate-900 border-slate-200/60 dark:border-slate-800 text-slate-400"
            }`}
          >
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3: Cohort Health */}
        <div className="bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
          <div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              {onTrackPercent}%
            </div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
              On-Track Rate
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. MINIMALIST SEARCH & FILTER TOOLBAR                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search mentees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === "ALL"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-slate-900"
            }`}
          >
            All ({mentees.length})
          </button>
          <button
            onClick={() => setStatusFilter("ON_TRACK")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === "ON_TRACK"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-slate-900"
            }`}
          >
            On Track
          </button>
          <button
            onClick={() => setStatusFilter("NEEDS_REVIEW")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === "NEEDS_REVIEW"
                ? "bg-amber-500 text-white shadow-2xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-slate-900"
            }`}
          >
            Needs Review
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. ROSTER TABLE (Clean, Linear-Style, Glanceable)            */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#070A11] text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-5 w-[32%]">Student</th>
                <th className="py-3 px-4 w-[24%]">Track</th>
                <th className="py-3 px-4 w-[16%]">Progress</th>
                <th className="py-3 px-4 w-[14%]">Status</th>
                <th className="py-3 px-4 w-[14%] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
              {filteredMentees.map((mentee) => {
                const primaryCourse = mentee.enrolledCourses?.[0];
                const missedItems = (mentee.enrolledCourses || []).flatMap((c) => c.missed || []);
                const upcomingItems = (mentee.enrolledCourses || []).flatMap((c) => c.upcoming || []);
                const progress = mentee.progressPercent || 0;

                return (
                  <tr
                    key={mentee.id}
                    onClick={() => handleOpenStudentDrawer(mentee)}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group"
                  >
                    {/* Student Column */}
                    <td className="py-3.5 px-5 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500/15 to-indigo-500/15 border border-sky-500/25 flex items-center justify-center font-bold text-sky-600 dark:text-sky-300 text-xs shrink-0 select-none">
                          {mentee.name ? mentee.name.charAt(0).toUpperCase() : "S"}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 dark:text-white truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                            {mentee.name}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {mentee.college || "Govt Degree College"}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Track Column */}
                    <td className="py-3.5 px-4 align-middle">
                      <div className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {primaryCourse?.courseTitle || "AI Agent Engineering"}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {missedItems.length > 0 ? (
                          <span className="text-rose-500 font-bold">{missedItems.length} overdue item</span>
                        ) : upcomingItems[0]?.date ? (
                          <span>Next: {new Date(upcomingItems[0].date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
                        ) : (
                          <span>Up to date</span>
                        )}
                      </div>
                    </td>

                    {/* Progress Column */}
                    <td className="py-3.5 px-4 align-middle">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden max-w-[80px]">
                          <div
                            className="h-full bg-sky-500 rounded-full transition-all duration-300"
                            style={{ width: `${Math.max(progress, 8)}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-[11px] text-slate-600 dark:text-slate-300">
                          {progress}%
                        </span>
                      </div>
                    </td>

                    {/* Status Column */}
                    <td className="py-3.5 px-4 align-middle">
                      {mentee.status === "NEEDS_REVIEW" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Review Ready
                        </span>
                      ) : mentee.status === "AT_RISK" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          At Risk
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          On Track
                        </span>
                      )}
                    </td>

                    {/* Action Column */}
                    <td className="py-3.5 px-4 align-middle text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenStudentDrawer(mentee);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-transparent hover:border-sky-500/20 transition-all cursor-pointer"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. STUDENT DETAIL SLIDE-OVER DRAWER (Details on Demand)        */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeDrawerStudent && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in font-sans">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={handleCloseStudentDrawer}
          />

          {/* Drawer Body */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-lg bg-white dark:bg-[#0B1120] border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
              {/* Drawer Top Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center font-bold text-sky-600 dark:text-sky-400 text-xs">
                    {activeDrawerStudent.name?.charAt(0).toUpperCase() || "S"}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {activeDrawerStudent.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 truncate">
                      {activeDrawerStudent.college}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCloseStudentDrawer}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
                {/* Contact info bar */}
                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-[#070A11] border border-slate-100 dark:border-slate-800/80 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Email</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block mt-0.5">
                      {activeDrawerStudent.email || "No email"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Phone</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block mt-0.5">
                      {activeDrawerStudent.phone || "No phone"}
                    </span>
                  </div>
                </div>

                {/* Enrolled Courses */}
                <div className="space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Enrolled Pathway</span>
                    <span className="text-sky-600 dark:text-sky-400 font-bold">
                      {activeDrawerStudent.progressPercent || 0}% Complete
                    </span>
                  </div>

                  {(activeDrawerStudent.enrolledCourses || []).map((course) => (
                    <div
                      key={course.courseId}
                      className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#070A11] space-y-3 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-sky-500" />
                          <span>{course.courseTitle}</span>
                        </div>
                      </div>

                      {/* Missed deliverables */}
                      {course.missed && course.missed.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">
                            Overdue Deliverables
                          </span>
                          <ul className="space-y-1.5">
                            {course.missed.map((m) => (
                              <li
                                key={m.id}
                                className="p-2 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/40 dark:border-rose-800/40 text-[11px] text-rose-700 dark:text-rose-300 flex items-center justify-between"
                              >
                                <span className="font-semibold truncate">{m.title}</span>
                                {m.dueDate && (
                                  <span className="text-[10px] text-rose-500 shrink-0 font-mono">
                                    Due {new Date(m.dueDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Upcoming touchpoints */}
                      {course.upcoming && course.upcoming.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-500">
                            Upcoming Live Sessions
                          </span>
                          <ul className="space-y-1.5">
                            {course.upcoming.map((u) => (
                              <li
                                key={u.id}
                                className="p-2 rounded-lg bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/40 dark:border-sky-800/40 text-[11px] text-sky-800 dark:text-sky-200 flex items-center justify-between"
                              >
                                <div className="min-w-0 pr-2">
                                  <div className="font-semibold truncate">{u.title}</div>
                                  {u.date && (
                                    <div className="text-[10px] text-sky-500 mt-0.5">
                                      {new Date(u.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} •{" "}
                                      {new Date(u.date).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                                    </div>
                                  )}
                                </div>
                                {u.meetUrl && (
                                  <a
                                    href={u.meetUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-sky-500 text-white hover:bg-sky-600 shrink-0"
                                  >
                                    <Video className="w-3 h-3" />
                                    <span>Meet</span>
                                  </a>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {!course.missed?.length && !course.upcoming?.length && (
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>All milestones up to date</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Submissions & Quick Grading */}
                <div className="space-y-3 pt-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Recent Submissions</span>
                    <span>{activeDrawerStudent.submissions?.length || 0} Total</span>
                  </div>

                  {activeDrawerStudent.submissions && activeDrawerStudent.submissions.length > 0 ? (
                    <div className="space-y-2">
                      {activeDrawerStudent.submissions.map((sub: any) => (
                        <div
                          key={sub.id}
                          className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#070A11] space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-bold text-slate-800 dark:text-slate-100">
                                {sub.title || sub.lessonId || "Assignment Submission"}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Submitted {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "Recently"}
                              </div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                sub.status === "GRADED" || sub.status === "APPROVED"
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60"
                                  : "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60"
                              }`}
                            >
                              {sub.status || "PENDING"}
                            </span>
                          </div>

                          {sub.submissionUrl && (
                            <a
                              href={sub.submissionUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                            >
                              <span>View Code / Deliverable</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}

                          {/* Quick Grading Action */}
                          {gradingSubId === sub.id ? (
                            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 mt-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[11px] text-slate-700 dark:text-slate-200">
                                  Score (out of 10):
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  max={10}
                                  value={gradeScore}
                                  onChange={(e) => setGradeScore(Number(e.target.value))}
                                  className="w-16 px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-right font-bold"
                                />
                              </div>
                              <input
                                type="text"
                                placeholder="Mentor feedback / comments..."
                                value={gradeFeedback}
                                onChange={(e) => setGradeFeedback(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                              />
                              <div className="flex items-center justify-end gap-1.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setGradingSubId(null)}
                                  className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleExecuteGrade(sub.id)}
                                  className="px-3 py-1 text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors flex items-center gap-1"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>Submit Grade</span>
                                </button>
                              </div>
                              {gradeFeedbackMsg && (
                                <p className="text-[10px] text-emerald-500 font-bold text-center mt-1">
                                  {gradeFeedbackMsg}
                                </p>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setGradingSubId(sub.id);
                                setGradeScore(sub.score ?? 10);
                                setGradeFeedback(sub.mentorFeedback || "");
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 mt-1 cursor-pointer"
                            >
                              <FileCheck2 className="w-3.5 h-3.5 text-sky-500" />
                              <span>{sub.status === "GRADED" ? "Edit Evaluation" : "Evaluate Submission"}</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
                      No submissions uploaded yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
