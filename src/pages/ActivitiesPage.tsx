import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileText,
  FileQuestion,
  Video,
  CheckCircle2,
  Check,
  Clock,
  Calendar,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { useGetStudentActivitiesQuery } from "../store/apiSlice";
import { cleanLessonTitle } from "../utils/formatContent";

export default function ActivitiesPage() {
  const navigate = useNavigate();
  // Default to "pending" tab as required
  const [statusFilter, setStatusFilter] = useState<"pending" | "completed">("pending");
  const [typeFilter, setTypeFilter] = useState<"all" | "assignment" | "quiz">("all");

  const { data: activitiesData, isLoading } = useGetStudentActivitiesQuery(undefined);

  const missedList = useMemo(() => activitiesData?.missed || [], [activitiesData]);
  const upcomingList = useMemo(() => activitiesData?.upcoming || [], [activitiesData]);
  const completedList = useMemo(() => activitiesData?.completed || [], [activitiesData]);
  const primaryPathwayId = activitiesData?.pathwayId || "cs-agentic";

  // Pending items = missed + upcoming
  const pendingList = useMemo(() => {
    const combined = [...missedList, ...upcomingList];
    if (typeFilter === "assignment") {
      return combined.filter((item) => item.type === "assignment");
    }
    if (typeFilter === "quiz") {
      return combined.filter((item) => item.type === "quiz" || item.type === "practice-quiz");
    }
    return combined;
  }, [missedList, upcomingList, typeFilter]);

  const filteredCompleted = useMemo(() => {
    if (typeFilter === "assignment") {
      return completedList.filter((item: any) => item.type === "assignment");
    }
    if (typeFilter === "quiz") {
      return completedList.filter((item: any) => item.type === "quiz");
    }
    return completedList;
  }, [completedList, typeFilter]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/70 dark:bg-[#0B0D13] py-4 sm:py-8 transition-colors">
      <div className="max-w-2xl lg:max-w-3xl mx-auto px-4 sm:px-6 space-y-5 animate-fade-in">
        {/* Title & Filter Chips Bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Activities
            </h1>
            {/* Optional Type Filter Pill Toggle */}
            <div className="flex items-center gap-1 bg-zinc-200/60 dark:bg-zinc-800/60 p-0.5 rounded-xl text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setTypeFilter("all")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  typeFilter === "all"
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("assignment")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  typeFilter === "assignment"
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                Labs
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("quiz")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  typeFilter === "quiz"
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                Quizzes
              </button>
            </div>
          </div>

          {/* Status Filter Chips: Pending (Default) & Completed */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter("pending")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                statusFilter === "pending"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              }`}
            >
              <span>Pending</span>
              {pendingList.length > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    statusFilter === "pending"
                      ? "bg-blue-500 text-white"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  {pendingList.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("completed")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                statusFilter === "completed"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              }`}
            >
              <span>Completed</span>
              {filteredCompleted.length > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    statusFilter === "completed"
                      ? "bg-blue-500 text-white"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  {filteredCompleted.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content Section */}
        {isLoading ? (
          <div className="space-y-3 pt-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-800 animate-pulse flex items-center gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3" />
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
                </div>
                <div className="w-16 h-8 bg-zinc-200 dark:bg-zinc-800 rounded-xl shrink-0" />
              </div>
            ))}
          </div>
        ) : statusFilter === "pending" ? (
          pendingList.length === 0 ? (
            <div className="bg-white dark:bg-[#121622] rounded-3xl border border-zinc-200/80 dark:border-zinc-800 p-8 text-center space-y-3 mt-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-2xs border border-emerald-100 dark:border-emerald-900/40">
                <CheckCircle2 className="w-6 h-6 stroke-[1.8]" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                You're all caught up!
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
                There are no pending activities or upcoming deadlines right now.
              </p>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {pendingList.map((item: any) => {
                const isOverdue = item.isOverdue || item.id?.includes("missed");
                const targetLink = `/learn/${item.pathwayId || primaryPathwayId}?lesson=${item.lessonId}`;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (item.type === "live" && item.meetUrl) {
                        window.open(item.meetUrl, "_blank");
                      } else {
                        navigate(targetLink);
                      }
                    }}
                    className={`bg-white dark:bg-zinc-900 rounded-2xl p-4 border transition-all shadow-xs flex items-center justify-between gap-3 cursor-pointer group active:scale-[0.99] ${
                      isOverdue
                        ? "border-rose-200/80 dark:border-rose-900/40 hover:border-rose-400"
                        : "border-zinc-200/80 dark:border-zinc-800 hover:border-blue-500/40"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-2">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                          isOverdue
                            ? "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40"
                            : item.type === "live"
                            ? "bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-900/40"
                            : item.type === "quiz"
                            ? "bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-900/40"
                            : "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40"
                        }`}
                      >
                        {item.type === "live" ? (
                          <Video className="w-5 h-5 stroke-[1.8]" />
                        ) : item.type === "quiz" ? (
                          <FileQuestion className="w-5 h-5 stroke-[1.8]" />
                        ) : (
                          <FileText className="w-5 h-5 stroke-[1.8]" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                          <span className="truncate">{item.moduleTitle || "Week 1"}</span>
                          <span>•</span>
                          <span className={isOverdue ? "text-rose-600 dark:text-rose-400" : ""}>
                            {item.category || (item.type === "quiz" ? "Quiz" : "Lab")}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate mt-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {cleanLessonTitle(item.title)}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {isOverdue ? (
                            <Clock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          ) : (
                            <Calendar className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                          )}
                          <span className={`truncate ${isOverdue ? "text-rose-600 dark:text-rose-400 font-medium" : ""}`}>
                            {item.dateText}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {item.type === "live" && item.meetUrl ? (
                        <a
                          href={item.meetUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="min-h-[44px] px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5"
                        >
                          <span>Join</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(targetLink);
                          }}
                          className={`min-h-[44px] px-4 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer ${
                            isOverdue
                              ? "bg-rose-600 hover:bg-rose-700 text-white"
                              : "bg-blue-600 hover:bg-blue-700 text-white"
                          }`}
                        >
                          {item.actionText || (isOverdue ? "Catch Up" : "Start")}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* Completed Tab */
          filteredCompleted.length === 0 ? (
            <div className="bg-white dark:bg-[#121622] rounded-3xl border border-zinc-200/80 dark:border-zinc-800 p-8 text-center space-y-2 mt-2">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto shadow-2xs">
                <CheckCircle2 className="w-6 h-6 stroke-[1.8]" />
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
                Finish an activity and it will show up here.
              </p>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {filteredCompleted.map((item: any) => (
                <div
                  key={item.id}
                  onClick={() => item.pathwayId && navigate(`/learn/${item.pathwayId}?lesson=${item.lessonId}`)}
                  className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex items-center justify-between gap-3 cursor-pointer group active:scale-[0.99] transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Check className="w-5 h-5 stroke-[2.5]" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                        <span className="truncate">{item.moduleTitle || item.course || "Week 1"}</span>
                        <span>•</span>
                        <span>{item.category || "Completed"}</span>
                      </div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate mt-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {cleanLessonTitle(item.title)}
                      </h3>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5 font-medium">
                        {item.datePrefix || "Completed"}: {item.date} {item.statusText ? `· ${item.statusText}` : ""}
                      </div>
                    </div>
                  </div>

                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200/60 dark:border-emerald-800/60 shrink-0">
                    Done
                  </span>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
