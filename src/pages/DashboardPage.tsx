import React, { useState, useMemo, useEffect, useRef } from "react";
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
  RefreshCw,
  BookOpen,
  Radio,
  AlertCircle,
} from "lucide-react";
import {
  useGetMyPathwaysQuery,
  useGetDashboardSummaryQuery,
} from "../store/apiSlice";
import { cleanLessonTitle } from "../utils/formatContent";
import {
  getCourseFlowStats,
  formatWeekTitle,
  getCountdownText,
  getLiveJoinStatus,
  getStudentFirstName,
  formatDateStandard,
} from "../utils/courseFlow";

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
    return (
      enrolledCourses[0] || {
        id: "cs-agentic",
        slug: "cs-agentic",
        title: "AI Agent Engineering",
      }
    );
  }, [enrolledCourses, selectedProgramId]);

  const currentProgramId = activeProgram.id || activeProgram.slug || "cs-agentic";
  const programTitle = activeProgram.title || activeProgram.name || "AI Agent Engineering";

  // 2. Aggregated Single Endpoint (B2) - Reduces mobile dashboard requests from 5 to 1
  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    isError: isContentError,
    refetch: refetchSummary,
  } = useGetDashboardSummaryQuery(currentProgramId, { skip: !currentProgramId || !isAuthenticated });

  const pathwayContent = summaryData?.pathwayContent;
  const progressData = summaryData?.progress;
  const submissionsData = summaryData?.submissions;
  const activitiesData = summaryData?.activities;
  const calendarEvents = summaryData?.calendarEvents || [];

  const isContentLoading = isSummaryLoading && !pathwayContent;
  const isProgressLoading = isSummaryLoading && !progressData;
  const isActivitiesLoading = isSummaryLoading && !activitiesData;

  const refetchContent = refetchSummary;
  const refetchProgress = refetchSummary;
  const refetchSubmissions = refetchSummary;
  const refetchActivities = refetchSummary;
  const refetchCalendar = refetchSummary;

  // Minute-by-minute timer for live class countdowns (B3)
  const [, setMinuteTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setMinuteTick((t) => t + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Shared Course Flow computation (Single source of truth)
  const modules = useMemo(() => {
    return pathwayContent?.courses?.[0]?.modules || [];
  }, [pathwayContent]);

  const completedIdsArray: string[] = useMemo(() => {
    return Array.from(new Set((progressData?.completedLessonIds || []) as string[]));
  }, [progressData]);

  const courseFlow = useMemo(() => {
    return getCourseFlowStats(modules, completedIdsArray, submissionsData || []);
  }, [modules, completedIdsArray, submissionsData]);

  // Current Week and Next Lesson Details for Resume Card (B2)
  const currentWeekNum = (courseFlow.currentWeekIndex || 0) + 1;
  const currentWeekTitle = formatWeekTitle(
    courseFlow.currentWeek?.title || "Module 1",
    courseFlow.currentWeekIndex || 0
  );
  const currentLessonTitle = cleanLessonTitle(
    courseFlow.nextIncompleteItem?.title || "1.1 Concept Lecture"
  );
  const totalWeeksCount = courseFlow.weekStats.length || modules.length || 12;

  // Next upcoming live class or deadline with minute-level countdown (B3)
  const upcomingLive = useMemo(() => {
    // Check if courseFlow has an active or upcoming live session
    if (courseFlow.upcomingLiveSession) {
      const { item, details } = courseFlow.upcomingLiveSession;
      const status = getLiveJoinStatus(item, item.unlockAt);
      const countdown = getCountdownText(item.unlockAt);
      return {
        id: item.id,
        title: cleanLessonTitle(item.title),
        dateFormatted: details.dateFormatted,
        timeFormatted: details.timeFormatted,
        userTimeZone: details.userTimeZone,
        meetUrl: details.meetUrl,
        countdown,
        status,
        type: "live",
        lessonId: item.id,
      };
    }

    // Fallback to activitiesData or calendarEvents
    const upcomingList = activitiesData?.upcoming || [];
    const liveActivity = upcomingList.find(
      (a: any) => a.type === "live" || a.category === "LIVE"
    );

    if (liveActivity) {
      const status = getLiveJoinStatus(liveActivity, liveActivity.unlockAt);
      const countdown = getCountdownText(liveActivity.unlockAt);
      return {
        id: liveActivity.id,
        title: cleanLessonTitle(liveActivity.title),
        dateFormatted: formatDateStandard(liveActivity.unlockAt || Date.now(), false),
        timeFormatted: liveActivity.dateText || "6:00 PM",
        userTimeZone: status.userTimeZone,
        meetUrl: liveActivity.meetUrl || status.meetUrl,
        countdown,
        status,
        type: "live",
        lessonId: liveActivity.lessonId || liveActivity.id,
      };
    }

    const futureCal = calendarEvents.find(
      (ev: any) =>
        ev.event_type === "LIVE_CLASS" &&
        new Date(ev.start_time).getTime() >= Date.now() - 2.5 * 60 * 60 * 1000
    );

    if (futureCal) {
      const status = getLiveJoinStatus(futureCal, futureCal.start_time);
      const countdown = getCountdownText(futureCal.start_time);
      return {
        id: futureCal.id,
        title: cleanLessonTitle(futureCal.title),
        dateFormatted: formatDateStandard(futureCal.start_time, false),
        timeFormatted: new Date(futureCal.start_time).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
        userTimeZone: status.userTimeZone,
        meetUrl: futureCal.meet_url || status.meetUrl,
        countdown,
        status,
        type: "live",
        lessonId: futureCal.lesson_id,
      };
    }

    return null;
  }, [courseFlow.upcomingLiveSession, activitiesData, calendarEvents]);

  // Grouped Pending Activities (B4: Overdue first, max 3 items)
  const { overdueActivities, upcomingActivities, totalPendingCount } = useMemo(() => {
    const missed = activitiesData?.missed || [];
    const upcoming = activitiesData?.upcoming || [];

    const isActivity = (item: any) => {
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
    };

    const overdueList = missed.filter(isActivity);
    const upcomingList = upcoming.filter(isActivity);

    const overdueSlice = overdueList.slice(0, 3);
    const remainingSlots = Math.max(0, 3 - overdueSlice.length);
    const upcomingSlice = upcomingList.slice(0, remainingSlots);

    return {
      overdueActivities: overdueSlice,
      upcomingActivities: upcomingSlice,
      totalPendingCount: overdueList.length + upcomingList.length,
    };
  }, [activitiesData]);

  // Real first name greeting with safe fallback to "there" (B1)
  const firstName = getStudentFirstName(user);

  // Refresh handler
  const handleRefresh = () => {
    refetchPathways();
    refetchContent();
    refetchProgress();
    refetchSubmissions();
    refetchActivities();
    refetchCalendar();
  };

  // Mobile pull-to-refresh (B5)
  const touchStartY = useRef(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current > 0 && window.scrollY === 0) {
      const distance = e.touches[0].clientY - touchStartY.current;
      if (distance > 70) {
        setIsPullRefreshing(true);
      }
    }
  };

  const handleTouchEnd = () => {
    if (isPullRefreshing) {
      handleRefresh();
      setTimeout(() => setIsPullRefreshing(false), 800);
    }
    touchStartY.current = 0;
  };

  const isInitialLoading = isPathwaysLoading || isContentLoading || isProgressLoading;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="min-h-[calc(100vh-4rem)] bg-slate-50/70 dark:bg-[#0B0D13] py-4 sm:py-6 transition-colors pb-24 sm:pb-12"
    >
      <div className="max-w-xl md:max-w-3xl mx-auto px-4 sm:px-6 space-y-4 sm:space-y-5 animate-fade-in">
        {/* Mobile Pull-to-Refresh Feedback Indicator */}
        {isPullRefreshing && (
          <div className="flex items-center justify-center gap-2 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40 rounded-xl animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Refreshing curriculum...</span>
          </div>
        )}

        {/* ─── B1. Greeting (Real first name, fallback to "there", never "LMS") ─── */}
        <div className="flex items-center justify-between pt-1">
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Hi {firstName}
          </h1>

          {/* Desktop-only Refresh button (hidden on mobile, B5) */}
          <button
            type="button"
            onClick={handleRefresh}
            aria-label="Refresh curriculum"
            className="hidden sm:inline-flex items-center gap-1.5 p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 stroke-[1.8]" />
            <span className="text-xs font-medium">Refresh</span>
          </button>
        </div>

        {/* ─── Program Switcher (Rendered only if student has > 1 enrolled program) ─── */}
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
                      {isSelected && (
                        <span className="text-[11px] font-bold text-blue-600">Active</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── B2. Unified Resume Card (Merged with Progress Bar) ─── */}
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
            {/* Header: Program & Merged Progress Line (B2) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider truncate">
                  {programTitle}
                </span>
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 shrink-0 font-mono">
                  Week {currentWeekNum} of {totalWeeksCount} · {courseFlow.progressPercent}% complete
                </span>
              </div>
              <h2 className="text-xs sm:text-sm font-semibold text-zinc-500 dark:text-zinc-400 truncate">
                {currentWeekTitle}
              </h2>
              <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 truncate">
                {currentLessonTitle}
              </h3>
            </div>

            {/* Thin Progress Bar (B2) */}
            <div className="space-y-1.5">
              <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${courseFlow.progressPercent}%` }}
                />
              </div>
            </div>

            {/* Full-width Action Button (min 44px tall, deep-links to exact lesson, B2) */}
            <button
              type="button"
              onClick={() => {
                const targetUrl = courseFlow.nextIncompleteItem
                  ? `/learn/${currentProgramId}?lesson=${courseFlow.nextIncompleteItem.id}`
                  : `/learn/${currentProgramId}`;
                navigate(targetUrl);
              }}
              className="w-full min-h-[44px] py-3 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-sm font-bold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>
                {courseFlow.completedActivities > 0 ? "Resume" : "Start Week 1"}
              </span>
              <Play className="w-4 h-4 fill-current" />
            </button>
          </div>
        )}

        {/* ─── B3. Today / Upcoming (Live Workshop with Countdown & 10min Window) ─── */}
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
            <div className="h-16 bg-zinc-100 dark:bg-zinc-800/60 rounded-2xl animate-pulse" />
          ) : !upcomingLive ? (
            <div className="py-2 text-xs text-zinc-500 dark:text-zinc-400">
              Nothing scheduled
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/30 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/70 border border-sky-200/60 dark:border-sky-900/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <Video className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                      {upcomingLive.dateFormatted} • {upcomingLive.timeFormatted}
                    </span>
                    {upcomingLive.countdown && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          upcomingLive.status.isLive
                            ? "bg-rose-500 text-white animate-pulse"
                            : "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                        }`}
                      >
                        {upcomingLive.countdown}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate mt-0.5">
                    {upcomingLive.title}
                  </h3>
                  <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                    Timezone: {upcomingLive.userTimeZone}
                  </div>
                </div>
              </div>

              {/* Join Button / Countdown Status Action (B3) */}
              <div className="shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                {upcomingLive.status.canJoin && upcomingLive.meetUrl ? (
                  <a
                    href={upcomingLive.meetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-auto min-h-[44px] px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs inline-flex items-center justify-center gap-1.5 transition-colors animate-pulse"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>Join Live</span>
                  </a>
                ) : upcomingLive.status.hasRecording && upcomingLive.status.recordingUrl ? (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/learn/${currentProgramId}?lesson=${upcomingLive.lessonId}`
                      )
                    }
                    className="w-full sm:w-auto min-h-[44px] px-4 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold shadow-2xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Watch recording</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    title={upcomingLive.status.label}
                    className="w-full sm:w-auto min-h-[44px] px-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 text-xs font-semibold cursor-not-allowed inline-flex items-center justify-center gap-1.5"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{upcomingLive.status.label}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ─── B4. Pending Activities (Overdue items grouped on top, max 3 items) ─── */}
        <section className="bg-white dark:bg-[#121622] rounded-3xl p-4 sm:p-5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Pending Activities
              </h2>
              {totalPendingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  {totalPendingCount}
                </span>
              )}
            </div>
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
          ) : overdueActivities.length === 0 && upcomingActivities.length === 0 ? (
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 text-center space-y-1">
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                All caught up!
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                No pending quizzes, labs, or assignments.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Group 1: Overdue Items (B4) */}
              {overdueActivities.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 px-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                    <AlertCircle className="w-3 h-3" />
                    <span>Overdue ({overdueActivities.length})</span>
                  </div>
                  {overdueActivities.map((act: any) => {
                    const targetLink = `/learn/${act.pathwayId || currentProgramId}?lesson=${act.lessonId}`;
                    return (
                      <div
                        key={act.id}
                        onClick={() => navigate(targetLink)}
                        className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/80 dark:hover:bg-rose-950/40 border border-rose-200/70 dark:border-rose-900/40 transition-all cursor-pointer group active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                            {act.type === "quiz" ? (
                              <FileQuestion className="w-4 h-4 stroke-[1.8]" />
                            ) : (
                              <FileText className="w-4 h-4 stroke-[1.8]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                Overdue
                              </span>
                              <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 truncate">
                                {act.category || (act.type === "quiz" ? "Quiz" : "Lab")} · {act.moduleTitle || "Week 1"}
                              </span>
                            </div>
                            <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-rose-600 transition-colors mt-0.5">
                              {cleanLessonTitle(act.title)}
                            </h3>
                            {act.allowLateSubmission && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                Late submission allowed
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Neutral / Amber action button for overdue items (B4) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(targetLink);
                          }}
                          className="min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-colors shrink-0 cursor-pointer"
                        >
                          Submit
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Group 2: Upcoming Items (B4) */}
              {upcomingActivities.length > 0 && (
                <div className="space-y-2">
                  {overdueActivities.length > 0 && (
                    <div className="px-1 text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                      Upcoming
                    </div>
                  )}
                  {upcomingActivities.map((act: any) => {
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
                              act.type === "quiz"
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
                              <Clock className="w-3 h-3 shrink-0" />
                              <span className="truncate">{act.dateText}</span>
                            </div>
                          </div>
                        </div>

                        {/* Standard primary accent button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(targetLink);
                          }}
                          className="min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors shrink-0 cursor-pointer"
                        >
                          Start
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ─── B5. Subtle Bottom Catalog Card (Replaces upsell banner) ─── */}
        <div className="pt-2 pb-4 text-center">
          <Link
            to="/catalog"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-2 px-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
          >
            <span>Explore all certification tracks in Catalog</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
