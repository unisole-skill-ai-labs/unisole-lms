import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Video,
  GraduationCap,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  Calendar,
  Sparkles,
  User,
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
  milestones?: any;
  selectedMenteeId?: string | null;
  onGradeSubmission?: (menteeId: string, submissionId: string, score: number, feedback: string) => void;
}

export default function MentorCockpitView({
  mentor,
  mentees = [],
  selectedMenteeId,
}: MentorCockpitProps) {
  const [currentMenteeId, setCurrentMenteeId] = useState<string>("");

  useEffect(() => {
    if (selectedMenteeId && mentees.some((m) => m.id === selectedMenteeId)) {
      setCurrentMenteeId(selectedMenteeId);
      return;
    }
    if (mentees.length > 0) {
      if (!currentMenteeId || !mentees.some((m) => m.id === currentMenteeId)) {
        setCurrentMenteeId(mentees[0].id);
      }
    } else {
      setCurrentMenteeId("");
    }
  }, [mentees, selectedMenteeId, currentMenteeId]);

  const selectedIndex = useMemo(() => {
    return mentees.findIndex((m) => m.id === currentMenteeId);
  }, [mentees, currentMenteeId]);

  const selectedMentee = useMemo(() => {
    if (selectedIndex >= 0) return mentees[selectedIndex];
    return mentees[0] || null;
  }, [mentees, selectedIndex]);

  const enrolledCourses: MenteeCourse[] = useMemo(() => {
    if (!selectedMentee) return [];
    if (Array.isArray(selectedMentee.enrolledCourses) && selectedMentee.enrolledCourses.length > 0) {
      return selectedMentee.enrolledCourses;
    }
    return [
      {
        courseId: "cs-p1",
        courseTitle: "Machine Learning Engineering in Production",
        slug: "ml-production",
        shortDescription: "Production ML pipelines, PyTorch deep learning, FastAPI model serving, Docker MLOps.",
        missed: [],
        upcoming: [],
      },
    ];
  }, [selectedMentee]);

  if (mentees.length === 0) {
    return (
      <div className="bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-12 text-center text-slate-400 space-y-3 shadow-2xs">
        <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Mentees Assigned</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          There are currently no active students allocated to this mentorship batch. Once students are enrolled, you will be able to select them from the dropdown to review their enrolled courses, missed items, and upcoming milestones.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Top Selector Bar: Mentor Dropdown & Quick Badges */}
      <div className="bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Dropdown for Mentor to select Student */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              <User className="w-4 h-4 text-sky-500" />
              <span>Select Student:</span>
            </div>

            <div className="relative min-w-[280px] sm:min-w-[340px]">
              <select
                id="mentor-student-dropdown"
                value={selectedMentee?.id || ""}
                onChange={(e) => setCurrentMenteeId(e.target.value)}
                className="w-full appearance-none bg-slate-50 dark:bg-[#070A11] border border-slate-200 dark:border-slate-700/80 hover:border-sky-500/50 rounded-xl px-4 py-2.5 pr-10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer transition-all shadow-2xs"
              >
                {mentees.map((m, idx) => (
                  <option key={m.id} value={m.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-1">
                    Student {idx + 1}: {m.name} {m.college ? `(${m.college})` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Quick S1, S2, S3 pill toggles matching sketch buttons */}
            <div className="flex items-center gap-1.5 pl-1 overflow-x-auto">
              {mentees.map((m, idx) => {
                const isSelected = m.id === currentMenteeId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setCurrentMenteeId(m.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                      isSelected
                        ? "bg-sky-500 text-white border-sky-500 shadow-xs"
                        : "bg-slate-100/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                    title={m.name}
                  >
                    S{idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mentor Profile / Badge on the right */}
          {mentor && (
            <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 self-end sm:self-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>
                Mentor: <strong className="text-slate-800 dark:text-slate-200">{mentor.name || "Assigned Mentor"}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Student View Area (Matching the handwritten sketch) */}
      {selectedMentee && (
        <div className="bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 sm:p-7 space-y-6 shadow-2xs">
          {/* Student Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-3.5">
              {selectedMentee.avatar && !selectedMentee.avatar.includes("unsplash") ? (
                <img
                  src={selectedMentee.avatar}
                  alt={selectedMentee.name}
                  className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 border border-sky-500/30 flex items-center justify-center font-black text-sky-600 dark:text-sky-300 text-sm shrink-0 select-none shadow-2xs">
                  {selectedMentee.name
                    ? selectedMentee.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    : `S${selectedIndex + 1}`}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Student {selectedIndex + 1}: {selectedMentee.name}
                  </h2>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      selectedMentee.status === "NEEDS_REVIEW"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        : selectedMentee.status === "AT_RISK"
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    }`}
                  >
                    {selectedMentee.status === "NEEDS_REVIEW"
                      ? "Needs Review"
                      : selectedMentee.status === "AT_RISK"
                      ? "At Risk"
                      : "On Track"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedMentee.email} {selectedMentee.college ? `• ${selectedMentee.college}` : ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {enrolledCourses.length} Enrolled {enrolledCourses.length === 1 ? "Course" : "Courses"}
              </span>
            </div>
          </div>

          {/* Section: Courses Table with Course | Missed | Upcoming */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-sky-500" />
                <span>Enrolled Courses & Milestones Overview</span>
              </h3>
              <span className="text-[11px] text-slate-400">Live Database Feed</span>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070A11]">
                    <th className="py-3.5 px-5 text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 w-[28%]">
                      Course
                    </th>
                    <th className="py-3.5 px-5 text-xs font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 w-[36%] border-l border-slate-200/60 dark:border-slate-800/60">
                      Missed
                    </th>
                    <th className="py-3.5 px-5 text-xs font-extrabold uppercase tracking-wider text-sky-700 dark:text-sky-400 w-[36%] border-l border-slate-200/60 dark:border-slate-800/60">
                      Upcoming
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-[#0B1120]">
                  {enrolledCourses.map((course) => (
                    <tr
                      key={course.courseId}
                      className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-colors"
                    >
                      {/* Column 1: Course */}
                      <td className="py-5 px-5 align-top space-y-2">
                        <div className="font-bold text-sm text-slate-900 dark:text-white flex items-start gap-2">
                          <GraduationCap className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                          <span>{course.courseTitle}</span>
                        </div>
                        {course.shortDescription && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                            {course.shortDescription}
                          </p>
                        )}
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60">
                          Enrolled
                        </span>
                      </td>

                      {/* Column 2: Missed (with -> arrows matching sketch) */}
                      <td className="py-5 px-5 align-top border-l border-slate-100 dark:border-slate-800/80">
                        {course.missed && course.missed.length > 0 ? (
                          <ul className="space-y-3">
                            {course.missed.map((item) => (
                              <li key={item.id} className="flex items-start gap-2.5 text-xs group">
                                <ArrowRight className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0 stroke-[2.5]" />
                                <div className="space-y-0.5 flex-1 min-w-0">
                                  <div className="font-semibold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                                    {item.title}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
                                    {item.dueDate && (
                                      <span className="text-rose-600 dark:text-rose-400 font-bold">
                                        Deadline: {new Date(item.dueDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                                      </span>
                                    )}
                                    {item.type && (
                                      <span className="px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 uppercase font-bold text-[9px] border border-rose-500/20">
                                        {item.type}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/10 px-3.5 py-2.5 rounded-xl border border-emerald-500/20">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>No missed items — all caught up!</span>
                          </div>
                        )}
                      </td>

                      {/* Column 3: Upcoming (with -> arrows matching sketch) */}
                      <td className="py-5 px-5 align-top border-l border-slate-100 dark:border-slate-800/80">
                        {course.upcoming && course.upcoming.length > 0 ? (
                          <ul className="space-y-3">
                            {course.upcoming.map((item) => (
                              <li key={item.id} className="flex items-start gap-2.5 text-xs group">
                                <ArrowRight className="w-3.5 h-3.5 text-sky-500 mt-0.5 shrink-0 stroke-[2.5]" />
                                <div className="space-y-1 flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                                      {item.title}
                                    </span>
                                    {item.meetUrl && (
                                      <a
                                        href={item.meetUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-sky-500 text-white hover:bg-sky-600 transition-all shadow-2xs shrink-0"
                                      >
                                        <Video className="w-3 h-3" />
                                        <span>Join Meet</span>
                                      </a>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
                                    {item.date && (
                                      <span className="text-sky-600 dark:text-sky-400 font-bold">
                                        {new Date(item.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} •{" "}
                                        {new Date(item.date).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                                      </span>
                                    )}
                                    {item.type && (
                                      <span className="px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 uppercase font-bold text-[9px] border border-sky-500/20">
                                        {item.type}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-slate-400 italic py-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>No upcoming sessions or deadlines</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
