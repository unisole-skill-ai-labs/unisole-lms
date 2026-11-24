import React, { useState, useMemo, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { BookOpen, CheckCircle2, Compass, Play, Layers, Calendar, ArrowRight } from "lucide-react";
import {
  useGetMyPathwaysQuery,
  useGetPathwayContentQuery,
  useGetStudentProgressQuery,
  useGetStudentSubmissionsQuery,
} from "../store/apiSlice";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import MacFolderIcon from "../components/ui/MacFolderIcon";
import { getPrefetchHandlers } from "../utils/routePrefetch";
import {
  formatEnrollmentDate,
  formatExpiryDate,
  getCourseFlowStats,
  formatWeekTitle,
} from "../utils/courseFlow";
import { cleanLessonTitle } from "../utils/formatContent";

interface CourseCardProps {
  item: any;
  submissionsData: any[];
}

function CourseCard({ item, submissionsData }: CourseCardProps) {
  const pathway = item.pathway || item;
  const pathwayId = pathway?.id || "cs-agentic";

  const { data: pathwayContent } = useGetPathwayContentQuery(
    { pathwayId, summary: true },
    {
      skip: !pathwayId,
    }
  );
  const { data: progressData } = useGetStudentProgressQuery(pathwayId, {
    skip: !pathwayId,
  });

  const modules = useMemo(() => {
    return pathwayContent?.courses?.[0]?.modules || [];
  }, [pathwayContent]);

  const completedIdsArray: string[] = useMemo(() => {
    return Array.from(new Set((progressData?.completedLessonIds || []) as string[]));
  }, [progressData]);

  const courseFlow = useMemo(() => {
    return getCourseFlowStats(modules, completedIdsArray, submissionsData || []);
  }, [modules, completedIdsArray, submissionsData]);

  const progressPercent = courseFlow.progressPercent || 0;
  const currentWeekNum = (courseFlow.currentWeekIndex || 0) + 1;
  const totalWeeksCount = courseFlow.weekStats.length || modules.length || 12;

  // Next incomplete activity info
  const nextItem = courseFlow.nextIncompleteItem;
  const nextItemTitle = nextItem ? cleanLessonTitle(nextItem.title) : "";
  const nextWeekTitle = courseFlow.currentWeek
    ? formatWeekTitle(courseFlow.currentWeek.title, courseFlow.currentWeekIndex || 0)
    : `Week ${currentWeekNum}`;

  // Next destination link - Always opens Course Overview
  const nextHref = `/learn/${pathwayId}`;

  // Button label
  const buttonLabel = progressPercent > 0 ? "Continue Course" : "Start Course";

  const isAnalytics = (pathway.title || "").toLowerCase().includes("analytic") || (pathway.title || "").toLowerCase().includes("data");
  const isWeb = (pathway.title || "").toLowerCase().includes("web") || (pathway.title || "").toLowerCase().includes("full stack");
  const folderColor = isAnalytics ? "amber" : isWeb ? "emerald" : "blue";

  const enrolledDateStr = formatEnrollmentDate(item.enrolledAt);
  const expiryDateStr = formatExpiryDate(item.expiresAt);

  return (
    <div className="w-full p-5 sm:p-6 flex flex-col justify-between h-full macos-card rounded-2xl group transition-all duration-200 hover:shadow-md border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900/60">
      <div className="space-y-4">
        {/* Top Header Badge & Enrollment Date */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <MacFolderIcon
              size="md"
              color={folderColor}
              className="shrink-0 group-hover:rotate-[-2deg] transition-transform"
            />
            <div>
              <div className="flex items-center gap-2">
                <Badge variant={courseFlow.isCourseCompleted ? "emerald" : "brand"} size="sm" className="gap-1 font-semibold">
                  <CheckCircle2 className="w-3 h-3" />
                  {courseFlow.isCourseCompleted ? "Completed" : "Active"}
                </Badge>
                {expiryDateStr && (
                  <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200/50 dark:border-amber-900/40">
                    {expiryDateStr}
                  </span>
                )}
              </div>
              <div className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 font-mono mt-1">
                {enrolledDateStr}
              </div>
            </div>
          </div>
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="font-extrabold text-base sm:text-lg text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {pathway.title}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed mt-1">
            {pathway.shortDescription || pathway.description || "Comprehensive modular learning curriculum."}
          </p>
        </div>

        {/* Progress Bar & Line: "Week 1 of 12 · 2% complete" (A1) */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-zinc-700 dark:text-zinc-300">
              Week {currentWeekNum} of {totalWeeksCount}
            </span>
            <span className="font-extrabold text-blue-600 dark:text-blue-400">
              {progressPercent}% complete
            </span>
          </div>
          <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="mt-5 pt-3.5 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <Link
          to={`/learn/${pathwayId}`}
          {...getPrefetchHandlers(`/learn/${pathwayId}`)}
          className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center sm:justify-start gap-1 py-1"
        >
          <span>Curriculum Overview</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>

        <Link to={nextHref} {...getPrefetchHandlers(nextHref)} className="w-full sm:w-auto">
          <Button
            size="sm"
            variant="primary"
            icon={Play}
            className="w-full sm:w-auto justify-center font-bold text-xs"
          >
            {buttonLabel}
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function EnrolledCoursesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const showAll = searchParams.get("all") === "true";
  const { isAuthenticated } = useSelector((state: any) => state.auth);

  const { data: myPathways = [], isLoading } = useGetMyPathwaysQuery(undefined, {
    skip: !isAuthenticated,
  });

  const { data: submissionsData = [] } = useGetStudentSubmissionsQuery(undefined, {
    skip: !isAuthenticated,
  });

  // Filter strictly to enrolled pathways, normalize aliases, and deduplicate by canonical ID
  const displayCourses = useMemo(() => {
    const seen = new Set<string>();
    const list: any[] = [];
    for (const item of myPathways) {
      const p = item.pathway || item;
      if (!p) continue;
      const rawId = p.id || p.slug || "";
      const canonId = (rawId === "course1" || p.slug === "course1") ? "cs-agentic" : rawId;
      if (canonId && seen.has(canonId)) {
        continue;
      }
      if (canonId) seen.add(canonId);
      list.push({
        ...item,
        pathway: item.pathway
          ? {
              ...item.pathway,
              id: canonId,
              slug: item.pathway.slug === "course1" ? "cs-agentic" : item.pathway.slug,
            }
          : item.pathway,
      });
    }
    return list;
  }, [myPathways]);

  const totalEnrolled = displayCourses.length;

  // Filter state for courses
  const [filterState, setFilterState] = useState<"all" | "in_progress" | "completed">("all");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 font-sans">
      {/* Page Header (Consistent "Courses" naming) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
              Courses
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
              <BookOpen className="w-3 h-3 stroke-[2.2]" />
              <span>
                {totalEnrolled} {totalEnrolled === 1 ? "Enrolled Course" : "Enrolled Courses"}
              </span>
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">
            Courses and curriculums you are actively enrolled in
          </p>
        </div>

        {/* Filter chips when 2+ courses exist (A2) */}
        {totalEnrolled >= 2 && (
          <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl">
            {(["all", "in_progress", "completed"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setFilterState(filter)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  filterState === filter
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                {filter === "all" ? "All" : filter === "in_progress" ? "In Progress" : "Completed"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Enrolled Courses Grid or Skeletons */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 space-y-4 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-20" />
                  <div className="h-3 bg-zinc-100 dark:bg-zinc-800/60 rounded w-28" />
                </div>
              </div>
              <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
              <div className="h-3 bg-zinc-100 dark:bg-zinc-800/60 rounded w-full" />
              <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
              <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
            </div>
          ))}
        </div>
      ) : totalEnrolled === 0 ? (
        <div className="macos-card rounded-3xl p-10 text-center space-y-4 max-w-md mx-auto">
          <MacFolderIcon size="lg" color="blue" className="mx-auto mb-2" />
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            No active enrolled courses yet
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xs mx-auto">
            You haven't enrolled in any courses yet.
          </p>
          <Link to="/">
            <Button variant="primary" size="sm">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {displayCourses.map((item: any) => (
            <CourseCard
              key={item.enrollmentId || item.id || item.pathway?.id}
              item={item}
              submissionsData={submissionsData}
            />
          ))}
        </div>
      )}
    </div>
  );
}
