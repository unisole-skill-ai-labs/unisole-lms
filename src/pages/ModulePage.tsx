import React, { useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  PlayCircle,
  FileQuestion,
  Code2,
  Video as VideoIcon,
  CheckCircle2,
  Clock,
  Lock,
  ChevronRight,
  Play,
  Calendar,
  AlertCircle,
} from "lucide-react";
import {
  useGetPathwayContentQuery,
  useGetStudentProgressQuery,
  useGetStudentSubmissionsQuery,
} from "../store/apiSlice";
import { getCurriculum } from "../constants/curriculumData";
import { cleanLessonTitle } from "../utils/formatContent";
import { formatIstDisplay } from "../utils/timezone";
import Spinner from "../components/ui/Spinner";
import NotFoundPage from "./NotFoundPage";
import { ArrowLeft } from "lucide-react";
const BackButton = ({ to, label, className = "" }: any) => <Link to={to} className={"inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors " + className}><ArrowLeft className="w-4 h-4" /><span>{label}</span></Link>;

export default function ModulePage() {
  const { pathwayId, moduleId } = useParams<{ pathwayId: string; moduleId: string }>();
  const navigate = useNavigate();

  // 1. Fetch pathway and curriculum data
  const {
    data: pathwayData,
    isLoading: isPathwayLoading,
    error: pathwayError,
  } = useGetPathwayContentQuery(pathwayId || "");

  const { data: progressData } = useGetStudentProgressQuery(pathwayId || "", {
    skip: !pathwayId,
  });

  const { data: submissionsData } = useGetStudentSubmissionsQuery(pathwayId || "", {
    skip: !pathwayId,
  });

  const allowCurriculumFallback =
    typeof window !== "undefined" &&
    (import.meta.env.VITE_ALLOW_CURRICULUM_FALLBACK === "true" ||
      import.meta.env.DEV ||
      window.location.hostname.includes("stg"));

  const canonical = useMemo(
    () => getCurriculum(pathwayId || ""),
    [pathwayId]
  );

  const completedLessonIds: string[] = useMemo(() => {
    return progressData?.completedLessonIds || [];
  }, [progressData]);

  // 2. Build modules list strictly scoped to this pathway
  const courses = pathwayData?.courses || [];
  const modules = useMemo(() => {
    const normalizedPathway = (pathwayId || "").toLowerCase();
    const targetCourses = courses.filter((c: any) => {
      const cId = (c.id || "").toLowerCase();
      const cSlug = (c.slug || "").toLowerCase();
      if (normalizedPathway === "cs-agentic" || normalizedPathway === "course1") {
        return cId === "cs-agentic" || cSlug === "cs-agentic" || cId === "course1";
      }
      return cId === normalizedPathway || cSlug === normalizedPathway;
    });
    const effectiveCourses = targetCourses.length > 0 ? targetCourses : courses;
    const allCourseModules = effectiveCourses.flatMap((c: any) => c.modules || []);
    const validCourseModules = allCourseModules.filter(
      (m: any) =>
        m &&
        m.title &&
        m.status === "PUBLISHED" &&
        m.isActive !== false &&
        !m.title.toLowerCase().includes("intro to ai")
    );

    if (validCourseModules.length > 0) {
      return validCourseModules.map((m: any, idx: number) => {
        const backendLessons = (m.lessons || []).filter(
          (l: any) => l && l.status === "PUBLISHED" && l.isActive !== false
        );

        const isModLocked = !!(
          m.isLocked ||
          (m.unlockAt && new Date(m.unlockAt).getTime() > Date.now())
        );

        return {
          id: String(m.id || `mod-${idx}`),
          slug: m.slug || `mod-${idx}`,
          title: m.title || `Module ${idx + 1}`,
          description: m.description || "",
          position: m.position || idx + 1,
          unlockAt: m.unlockAt || null,
          lockAt: m.lockAt || null,
          isLocked: isModLocked,
          isScheduleLocked: !!(m.unlockAt && new Date(m.unlockAt).getTime() > Date.now()),
          items: backendLessons.map((l: any, lIdx: number) => {
            let parsedContent: any = null;
            if (l.content && typeof l.content === "string" && l.content.startsWith("{")) {
              try {
                parsedContent = JSON.parse(l.content);
              } catch {
                parsedContent = null;
              }
            }

            const curMode = (
              l.curriculumMode ||
              parsedContent?.curriculumMode ||
              parsedContent?.category ||
              l.category ||
              ""
            ).toUpperCase();
            const cType = (l.contentType || parsedContent?.type || "").toUpperCase();
            const testType = (l.testType || parsedContent?.testType || "").toUpperCase();
            const pracType = (l.practiceType || parsedContent?.practiceType || "").toUpperCase();

            const isLive =
              curMode === "LIVE" ||
              cType === "LIVE" ||
              l.type === "live" ||
              l.category === "LIVE" ||
              l.id?.includes("_live");

            const isExplicitTest = curMode === "TEST" || parsedContent?.category === "TEST";
            const isExplicitPractice = curMode === "PRACTICE" || parsedContent?.category === "PRACTICE";

            const hasRealVideo = !!(l.videoUrl?.trim() || parsedContent?.videoUrl?.trim());
            const isVideo =
              !isLive &&
              hasRealVideo &&
              (cType === "VIDEO" || curMode === "LECTURE" || parsedContent?.category === "LECTURE");

            const isQuiz =
              !isLive &&
              !isVideo &&
              (cType === "QUIZ" || pracType === "MCQ" || l.id?.includes("_quiz"));

            const isCoding =
              !isLive &&
              !isVideo &&
              !isQuiz &&
              (testType === "CODING_TEST" || cType === "CODING_TEST" || l.id?.includes("_code") || l.id?.includes("_lab"));

            const isAssignment =
              !isLive &&
              !isVideo &&
              !isQuiz &&
              !isCoding &&
              (cType === "ASSIGNMENT" || l.id?.includes("_assign"));

            const isLessonLocked = !!(
              isModLocked ||
              l.isLocked ||
              (l.unlockAt && new Date(l.unlockAt).getTime() > Date.now())
            );

            const resolvedType = isLive
              ? ("live" as const)
              : isVideo
              ? ("video" as const)
              : isQuiz
              ? ("quiz" as const)
              : isCoding
              ? ("coding_test" as const)
              : isAssignment
              ? ("assignment" as const)
              : ("reading" as const);

            return {
              id: String(l.id || `les-${lIdx}`),
              title: l.title || `Lesson ${lIdx + 1}`,
              duration: l.durationMinutes ? `${l.durationMinutes} Mins` : l.duration || "20 Mins",
              type: resolvedType,
              category: curMode || (isVideo ? "LECTURE" : isQuiz || isCoding ? "PRACTICE" : "READING"),
              unlockAt: l.unlockAt || null,
              lockAt: l.lockAt || null,
              isLocked: isLessonLocked,
              videoUrl: l.videoUrl || parsedContent?.videoUrl || "",
              description: l.description || l.content || "",
            };
          }),
        };
      });
    }

    // Fallback to canonical curriculum if enabled and DB empty
    if (allowCurriculumFallback && canonical.modules && canonical.modules.length > 0) {
      return canonical.modules.map((m, idx) => ({
        ...m,
        id: String(m.id?.startsWith(normalizedPathway) ? m.id : `${normalizedPathway}-${m.id || `week-${idx + 1}`}`),
        slug: `${normalizedPathway}-week-${idx + 1}`,
        position: idx + 1,
        items: (m.items || []).map((it, iIdx) => ({
          ...it,
          id: String(it.id?.startsWith(normalizedPathway) ? it.id : `${normalizedPathway}-${it.id || `les-${idx + 1}-${iIdx + 1}`}`),
          type: it.type || "reading",
          videoUrl: it.videoUrl && !it.videoUrl.includes("dQw4w9WgXcQ") ? it.videoUrl : "",
        })),
      }));
    }

    return [];
  }, [courses, pathwayId, allowCurriculumFallback, canonical]);

  // Loading state
  if (isPathwayLoading && modules.length === 0) {
    return (
      <div className="min-h-[calc(100vh-4rem)] max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <BackButton to={`/learn/${pathwayId}`} label="Back to course" />
        <div className="py-16 flex flex-col items-center justify-center space-y-4">
          <Spinner size="lg" />
          <p className="text-sm font-semibold text-zinc-500">Loading module curriculum...</p>
        </div>
      </div>
    );
  }

  // Error / Access Denied
  if (pathwayError) {
    const is403 = (pathwayError as any)?.status === 403;
    return (
      <div className="min-h-[calc(100vh-4rem)] max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="flex justify-start">
          <BackButton to="/enrolled" label="Back to my courses" />
        </div>
        <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          {is403 ? "Course Access Required" : "Unable to Load Module"}
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          {is403
            ? "You do not have an active enrollment in this course. Please contact academic support or enroll to access this module."
            : "An unexpected error occurred while loading this curriculum module."}
        </p>
        <BackButton to="/enrolled" label="Back to My Courses" variant="pill" />
      </div>
    );
  }

  // 3. Find current module strictly by ID or slug within this pathway
  const targetModId = moduleId?.trim().toLowerCase();
  const currentModule = modules.find((m) => {
    const mId = m.id.toLowerCase();
    const mSlug = (m.slug || "").toLowerCase();
    return (
      mId === targetModId ||
      mSlug === targetModId ||
      mId === `mod_${targetModId}` ||
      mId === `${pathwayId}-${targetModId}`
    );
  });

  // Module not found in this course -> 404
  if (!currentModule) {
    return (
      <div className="min-h-[calc(100vh-4rem)] max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <BackButton to={`/learn/${pathwayId}`} label="Back to course" />
        <NotFoundPage />
      </div>
    );
  }

  const courseTitle = pathwayData?.pathway?.title || canonical.title || "Course Curriculum";
  const moduleLessons = currentModule.items || [];
  const totalLessons = moduleLessons.length;
  const completedCount = moduleLessons.filter((l) => completedLessonIds.includes(l.id)).length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-50/50 dark:bg-[#070A11] text-zinc-900 dark:text-zinc-100 pb-20">
      {/* Top Header & Breadcrumbs */}
      <div className="bg-white dark:bg-[#0B1120] border-b border-zinc-200/80 dark:border-zinc-800/80 sticky top-[var(--nav-h,4rem)] z-20 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 space-y-3">
          {/* Top Row: BackButton and Breadcrumbs */}
          <div className="flex flex-wrap items-center gap-3">
            <BackButton
              to={`/learn/${pathwayId}`}
              label="Back to course"
              className="text-xs"
            />
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />
            {/* Breadcrumbs Navigation */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 min-w-0">
              <Link to="/enrolled" className="hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors shrink-0">
                Courses
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <Link
                to={`/learn/${pathwayId}`}
                className="hover:text-blue-600 dark:hover:text-blue-400 font-medium truncate max-w-[160px] sm:max-w-xs transition-colors"
              >
                {courseTitle}
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate">{currentModule.title}</span>
            </nav>
          </div>

          {/* Module Header & Progress */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-zinc-900 dark:text-white truncate">
                  {currentModule.title}
                </h1>
                {currentModule.isLocked && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shrink-0">
                    <Lock className="w-3 h-3" />
                    <span>Locked</span>
                  </span>
                )}
              </div>
              {currentModule.description && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 max-w-2xl">
                  {currentModule.description}
                </p>
              )}
            </div>

            {/* Progress Pill */}
            {!currentModule.isLocked && totalLessons > 0 && (
              <div className="flex items-center gap-3 shrink-0 bg-zinc-50 dark:bg-zinc-900/60 p-2 sm:px-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                <div className="w-20 sm:w-24 h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 font-mono">
                  {completedCount}/{totalLessons} done
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Module Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
        {/* Module Lock Notice */}
        {currentModule.isLocked ? (
          <div className="p-8 text-center bg-white dark:bg-[#0B1120] rounded-3xl border border-amber-300/60 dark:border-amber-900/40 shadow-xs space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">This module is currently locked</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
              {currentModule.unlockAt
                ? `Content will become available on ${formatIstDisplay(currentModule.unlockAt)}.`
                : "This module has not yet been unlocked by the instructor."}
            </p>
            <div className="pt-2">
              <BackButton
                to={`/learn/${pathwayId}`}
                label="Return to Course Overview"
                variant="pill"
              />
            </div>
          </div>
        ) : totalLessons === 0 ? (
          /* Empty State: Content Coming Soon */
          <div className="p-12 text-center bg-white dark:bg-[#0B1120] rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Content coming soon</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
              Lectures and interactive activities for this module are being prepared by the course instructor.
            </p>
            <div className="pt-2">
              <BackButton
                to={`/learn/${pathwayId}`}
                label="Return to Course Overview"
                variant="pill"
              />
            </div>
          </div>
        ) : (
          /* Ordered List of Module Activities */
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-500 uppercase tracking-wider px-1">
              <span>Curriculum Activities</span>
              <span>{totalLessons} items</span>
            </div>

            <div className="space-y-2.5">
              {moduleLessons.map((lesson, idx) => {
                const isCompleted = completedLessonIds.includes(lesson.id);
                const isLocked = lesson.isLocked || currentModule.isLocked;
                const playerUrl = `/learn/${pathwayId}?module=${currentModule.id}&lesson=${lesson.id}`;

                let IconComponent = BookOpen;
                let iconColor = "text-blue-500";
                if (lesson.type === "video") {
                  IconComponent = PlayCircle;
                  iconColor = "text-sky-500";
                } else if (lesson.type === "quiz") {
                  IconComponent = FileQuestion;
                  iconColor = "text-purple-500";
                } else if (lesson.type === "coding_test" || lesson.type === "assignment") {
                  IconComponent = Code2;
                  iconColor = "text-amber-500";
                } else if (lesson.type === "live") {
                  IconComponent = VideoIcon;
                  iconColor = "text-rose-500";
                }

                let actionLabel = "Start";
                if (isCompleted) {
                  actionLabel = "Review";
                } else if (lesson.type === "video") {
                  actionLabel = "Watch";
                } else if (lesson.type === "quiz") {
                  actionLabel = "Take Quiz";
                } else if (lesson.type === "coding_test" || lesson.type === "assignment") {
                  actionLabel = "Start Lab";
                } else if (lesson.type === "live") {
                  actionLabel = "Join";
                }

                return (
                  <div
                    key={lesson.id}
                    data-testid="activity-card"
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all duration-150 ${
                      isLocked
                        ? "bg-zinc-100/50 dark:bg-zinc-900/30 border-zinc-200/60 dark:border-zinc-800/40 opacity-70 cursor-not-allowed"
                        : isCompleted
                        ? "bg-zinc-50/80 dark:bg-[#070D18]/60 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-2xs"
                        : "bg-white dark:bg-[#0B1120] border-zinc-200/80 dark:border-zinc-800 hover:border-blue-500/50 dark:hover:border-blue-500/50 shadow-2xs"
                    }`}
                  >
                    {/* Left: Index + Status Icon + Title + Meta */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Numeric Index / Checkmark */}
                      <div className="shrink-0 flex items-center justify-center">
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/10" />
                        ) : isLocked ? (
                          <Lock className="w-4 h-4 text-zinc-400" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-zinc-300 dark:border-zinc-700" />
                        )}
                      </div>

                      {/* Type icon & Title */}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <IconComponent className={`w-4 h-4 shrink-0 ${iconColor}`} />
                          <h3
                            className={`text-sm font-bold truncate ${
                              isCompleted
                                ? "text-zinc-600 dark:text-zinc-400"
                                : "text-zinc-900 dark:text-zinc-100"
                            }`}
                          >
                            {cleanLessonTitle(lesson.title)}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                          <span className="capitalize">{lesson.type.replace("_", " ")}</span>
                          <span>•</span>
                          <span>{lesson.duration}</span>
                          {lesson.unlockAt && isLocked && (
                            <>
                              <span>•</span>
                              <span className="text-amber-600 dark:text-amber-400 font-bold">
                                Unlocks on {formatIstDisplay(lesson.unlockAt)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Action Button */}
                    <div className="shrink-0 flex items-center justify-end">
                      {isLocked ? (
                        <button
                          type="button"
                          disabled
                          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 font-bold text-xs cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Locked</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate(playerUrl)}
                          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <span>{actionLabel}</span>
                          <Play className="w-3 h-3 fill-current" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
