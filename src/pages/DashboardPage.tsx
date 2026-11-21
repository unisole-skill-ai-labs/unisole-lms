import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Play,
  ArrowRight,
  Calendar as CalendarIcon,
  Clock,
  FileQuestion,
  FileText,
  Video,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  ChevronDown,
  Sparkles,
  RefreshCw,
  BookOpen,
} from "lucide-react";
import {
  useGetMyPathwaysQuery,
  useGetPathwayContentQuery,
  useGetStudentProgressQuery,
  useGetStudentActivitiesQuery,
  useGetCalendarEventsQuery,
} from "../store/apiSlice";
import { cleanLessonTitle } from "../utils/formatContent";

export default function DashboardPage() {
  const { isAuthenticated, user } = useSelector((state: any) => state.auth);
  const navigate = useNavigate();

  // 1. Enrolled Programs
  const {
    data: myPathways = [],
    isLoading: isPathwaysLoading,
    isError: isPathwaysError,
    refetch: refetchPathways,
  } = useGetMyPathwaysQuery(undefined, { skip: !isAuthenticated });

  const enrolledCourses = useMemo(() => {
    return myPathways
      .map((item: any) => item.pathway || item)
      .filter((p: any) => p && (p.title || p.name));
  }, [myPathways]);

  // Selected active program (defaults to first enrolled program or "cs-agentic")
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [programDropdownOpen, setProgramDropdownOpen] = useState(false);

  const activeProgram = useMemo(() => {
    if (selectedProgramId) {
      const match = enrolledCourses.find((c: any) => (c.id || c.slug) === selectedProgramId);
      if (match) return match;
    }
    return enrolledCourses[0] || {
      id: "cs-agentic",
      slug: "cs-agentic",
      title: "AI Agent Engineering",
    };
  }, [enrolledCourses, selectedProgramId]);

  const currentProgramId = activeProgram.id || activeProgram.slug || "cs-agentic";
  const programTitle = activeProgram.title || activeProgram.name || "AI Agent Engineering";

  // 2. Pathway Curriculum & Lessons
  const {
    data: pathwayContent,
    isLoading: isContentLoading,
    isError: isContentError,
    refetch: refetchContent,
  } = useGetPathwayContentQuery(currentProgramId, { skip: !currentProgramId });

  // 3. Student Progress
  const {
    data: progressData,
    isLoading: isProgressLoading,
    refetch: refetchProgress,
  } = useGetStudentProgressQuery(currentProgramId, { skip: !currentProgramId });

  // 4. Student Activities (missed, upcoming, completed)
  const {
    data: activitiesData,
    isLoading: isActivitiesLoading,
    refetch: refetchActivities,
  } = useGetStudentActivitiesQuery(undefined, { skip: !isAuthenticated });

  // 5. Calendar Events
  const { data: calendarEvents = [] } = useGetCalendarEventsQuery(undefined, {
    skip: !isAuthenticated,
  });

  // Extract all modules & ordered lessons
  const modules = useMemo(() => {
    return pathwayContent?.courses?.[0]?.modules || [];
  }, [pathwayContent]);

  const allLessons = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      moduleId: string;
      moduleTitle: string;
      moduleIndex: number;
      lessonIndex: number;
    }> = [];

    modules.forEach((mod: any, mIdx: number) => {
      (mod.lessons || []).forEach((les: any, lIdx: number) => {
        list.push({
          id: les.id,
          title: cleanLessonTitle(les.title),
          moduleId: mod.id,
          moduleTitle: mod.title,
          moduleIndex: mIdx + 1,
          lessonIndex: lIdx + 1,
        });
      });
    });
    return list;
  }, [modules]);

  const completedLessonIds = useMemo(() => {
    return new Set<string>(progressData?.completedLessonIds || []);
  }, [progressData]);

  // Determine current lesson to resume or start
  const continueState = useMemo(() => {
    if (allLessons.length === 0) {
      return {
        moduleTitle: "Week 1",
        lessonTitle: "Introduction to AI Agents",
        lessonId: null,
        isStarted: false,
        isFinished: false,
        moduleIndex: 1,
        totalModules: 12,
        percent: 0,
      };
    }

    const totalModules = modules.length || 12;
    const completedCount = completedLessonIds.size;
    const percent = Math.min(100, Math.round((completedCount / allLessons.length) * 100));

    // Has user completed any lesson?
    const isStarted = completedCount > 0 || !!progressData?.lastLessonId;

    if (completedCount >= allLessons.length) {
      const last = allLessons[allLessons.length - 1];
      return {
        moduleTitle: last.moduleTitle || `Week ${last.moduleIndex}`,
        lessonTitle: last.title,
        lessonId: last.id,
        isStarted: true,
        isFinished: true,
        moduleIndex: last.moduleIndex,
        totalModules,
        percent: 100,
      };
    }

    // Check if backend returned lastLessonId
    if (progressData?.lastLessonId) {
      const match = allLessons.find((l) => l.id === progressData.lastLessonId);
      if (match) {
        return {
          moduleTitle: match.moduleTitle || `Week ${match.moduleIndex}`,
          lessonTitle: match.title,
          lessonId: match.id,
          isStarted,
          isFinished: false,
          moduleIndex: match.moduleIndex,
          totalModules,
          percent,
        };
      }
    }

    // Next incomplete lesson
    const nextIncomplete = allLessons.find((l) => !completedLessonIds.has(l.id)) || allLessons[0];
    return {
      moduleTitle: nextIncomplete.moduleTitle || `Week ${nextIncomplete.moduleIndex}`,
      lessonTitle: nextIncomplete.title,
      lessonId: nextIncomplete.id,
      isStarted,
      isFinished: false,
      moduleIndex: nextIncomplete.moduleIndex,
      totalModules,
      percent,
    };
  }, [allLessons, completedLessonIds, progressData, modules]);

  // Today / Upcoming: next live workshop or deadline
  const nextUpcoming = useMemo(() => {
    const upcoming = activitiesData?.upcoming || [];
    if (upcoming.length > 0) {
      return upcoming[0];
    }
    // Check calendar events
    if (calendarEvents.length > 0) {
      const now = new Date();
      const future = calendarEvents
        .filter((ev: any) => new Date(ev.start_time).getTime() >= now.getTime() - 2 * 60 * 60 * 1000)
        .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      if (future[0]) {
        const ev = future[0];
        const isToday = new Date(ev.start_time).toDateString() === now.toDateString();
        return {
          id: ev.id,
          type: ev.event_type === "LIVE_CLASS" ? "live" : "assignment",
          title: ev.title,
          dateText: isToday
            ? `Today • ${new Date(ev.start_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
            : new Date(ev.start_time).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
          meetUrl: ev.meet_url,
          isToday,
          lessonId: ev.lesson_id,
        };
      }
    }
    return null;
  }, [activitiesData, calendarEvents]);

  // Pending Activities: next 3 incomplete quizzes, labs or assignments
  const pendingActivities = useMemo(() => {
    const missed = activitiesData?.missed || [];
    const upcoming = activitiesData?.upcoming || [];
    const combined = [...missed, ...upcoming].filter((item) => {
      const t = (item.type || "").toLowerCase();
      const cat = (item.category || "").toLowerCase();
      return (
        t === "quiz" ||
        t === "assignment" ||
        t === "lab" ||
        cat.includes("quiz") ||
        cat.includes("lab") ||
        cat.includes("assignment") ||
        cat.includes("project")
      );
    });
    return combined.slice(0, 3);
  }, [activitiesData]);

  const firstName = user?.name ? user.name.trim().split(" ")[0] : "Learner";

  const handleRefresh = () => {
    refetchPathways();
    refetchContent();
    refetchProgress();
    refetchActivities();
  };

  const isInitialLoading = isPathwaysLoading || isContentLoading || isProgressLoading;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/70 dark:bg-[#0B0D13] py-4 sm:py-6 transition-colors">
      <div className="max-w-xl md:max-w-3xl mx-auto px-4 sm:px-6 space-y-4 sm:space-y-5 animate-fade-in">
        {/* ─── 1b. Greeting ─── */}
        <div className="flex items-center justify-between pt-1">
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Hi {firstName}
          </h1>

          {/* Optional Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            aria-label="Refresh data"
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 stroke-[1.8]" />
          </button>
        </div>

        {/* ─── 1g. Program Switcher (Show only if student has > 1 enrolled program) ─── */}
        {enrolledCourses.length > 1 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setProgramDropdownOpen((prev) => !prev)}
              className="w-full flex items-center justify-between min-h-[44px] px-3.5 py-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block leading-tight">
                    Current Program
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate block mt-0.5">
                    {programTitle}
                  </span>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ${
                  programDropdownOpen ? "rotate-180 text-blue-600" : ""
                }`}
              />
            </button>

            {programDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 p-1.5 bg-white dark:bg-[#121622] rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 z-30 space-y-0.5 animate-fade-in">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Select Program
                </div>
                {enrolledCourses.map((c: any) => {
                  const id = c.id || c.slug;
                  const title = c.title || c.name;
                  const isSelected = id === currentProgramId;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setSelectedProgramId(id);
                        setProgramDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <span className="truncate">{title}</span>
                      {isSelected && <span className="text-[11px] font-bold text-blue-600">Active</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── 1c. Continue Learning Card (Full width, Top priority) ─── */}
        {isInitialLoading ? (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs animate-pulse space-y-4">
            <div className="h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4" />
            <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
            <div className="h-4 bg-zinc-100 dark:bg-zinc-800/60 rounded w-1/2" />
            <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full w-full" />
            <div className="h-11 bg-zinc-200 dark:bg-zinc-800 rounded-2xl w-full" />
          </div>
        ) : isContentError && enrolledCourses.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200/80 dark:border-zinc-800 shadow-xs text-center space-y-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Unable to load course content.
            </p>
            <button
              type="button"
              onClick={handleRefresh}
              className="min-h-[44px] px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#121622] rounded-3xl p-5 sm:p-6 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
            {/* Header: Program & Module */}
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider truncate">
                  {programTitle}
                </span>
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 shrink-0">
                  {continueState.percent}% complete
                </span>
              </div>
              <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 truncate">
                {continueState.moduleTitle}
              </h2>
              <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 truncate">
                {continueState.lessonTitle}
              </h3>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${continueState.percent}%` }}
                />
              </div>
            </div>

            {/* Full-width Action Button (min 44px tall) */}
            <button
              type="button"
              onClick={() => {
                const targetUrl = continueState.lessonId
                  ? `/learn/${currentProgramId}?lesson=${continueState.lessonId}`
                  : `/learn/${currentProgramId}`;
                navigate(targetUrl);
              }}
              className="w-full min-h-[44px] py-3 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-sm font-bold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>{continueState.isStarted ? "Resume" : "Start Week 1"}</span>
              <Play className="w-4 h-4 fill-current" />
            </button>
          </div>
        )}

        {/* ─── 1d. Today / Upcoming ─── */}
        <section className="bg-white dark:bg-[#121622] rounded-3xl p-4 sm:p-5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Today / Upcoming
            </h2>
            <Link
              to="/calendar"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>View calendar</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isActivitiesLoading ? (
            <div className="h-14 bg-zinc-100 dark:bg-zinc-800/60 rounded-2xl animate-pulse" />
          ) : !nextUpcoming ? (
            <div className="py-2 text-xs text-zinc-500 dark:text-zinc-400">
              Nothing scheduled
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/30">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/70 border border-sky-200/60 dark:border-sky-900/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  {nextUpcoming.type === "live" ? (
                    <Video className="w-5 h-5 stroke-[1.8]" />
                  ) : (
                    <CalendarIcon className="w-5 h-5 stroke-[1.8]" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {nextUpcoming.isToday && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                        Today
                      </span>
                    )}
                    <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 truncate">
                      {nextUpcoming.dateText}
                    </span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate mt-0.5">
                    {cleanLessonTitle(nextUpcoming.title)}
                  </h3>
                </div>
              </div>

              {nextUpcoming.type === "live" && nextUpcoming.meetUrl ? (
                <a
                  href={nextUpcoming.meetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="min-h-[44px] px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <span>Join</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/learn/${currentProgramId}?lesson=${nextUpcoming.lessonId || nextUpcoming.id}`
                    )
                  }
                  className="min-h-[44px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs inline-flex items-center shrink-0 transition-colors cursor-pointer"
                >
                  Start
                </button>
              )}
            </div>
          )}
        </section>

        {/* ─── 1e. Pending Activities ─── */}
        <section className="bg-white dark:bg-[#121622] rounded-3xl p-4 sm:p-5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Pending Activities
            </h2>
            <Link
              to="/activities"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isActivitiesLoading ? (
            <div className="space-y-2.5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-zinc-100 dark:bg-zinc-800/60 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : pendingActivities.length === 0 ? (
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 text-center space-y-1">
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                All caught up!
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                No pending quizzes, labs, or assignments.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {pendingActivities.map((act: any) => {
                const isOverdue = act.isOverdue || act.id?.includes("missed");
                const targetLink = `/learn/${act.pathwayId || currentProgramId}?lesson=${act.lessonId}`;

                return (
                  <div
                    key={act.id}
                    onClick={() => navigate(targetLink)}
                    className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/50 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800/80 transition-all cursor-pointer group active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isOverdue
                            ? "bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400"
                            : act.type === "quiz"
                            ? "bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400"
                            : "bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400"
                        }`}
                      >
                        {act.type === "quiz" ? (
                          <FileQuestion className="w-4 h-4 stroke-[1.8]" />
                        ) : (
                          <FileText className="w-4 h-4 stroke-[1.8]" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 truncate">
                          {act.category || (act.type === "quiz" ? "Quiz" : "Lab")} · {act.moduleTitle || "Week 1"}
                        </div>
                        <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {cleanLessonTitle(act.title)}
                        </h3>
                        <div className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          <Clock className={`w-3 h-3 shrink-0 ${isOverdue ? "text-rose-500" : ""}`} />
                          <span className={`truncate ${isOverdue ? "text-rose-600 dark:text-rose-400 font-medium" : ""}`}>
                            {act.dateText}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(targetLink);
                      }}
                      className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0 cursor-pointer ${
                        isOverdue
                          ? "bg-rose-600 hover:bg-rose-700 text-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      {act.actionText || (isOverdue ? "Catch Up" : "Start")}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ─── 1f. Program Progress ─── */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#121622] border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-600 dark:text-zinc-400">
            <span>
              Week {continueState.moduleIndex} of {continueState.totalModules} · {continueState.percent}% complete
            </span>
          </div>
          <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${continueState.percent}%` }}
            />
          </div>
        </div>

        {/* Catalog Link */}
        <div className="text-center pt-1 pb-4">
          <Link
            to="/catalog"
            className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-1.5 px-3 rounded-lg"
          >
            <span>Explore all certification tracks in Catalog</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
