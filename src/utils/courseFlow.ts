import { LessonItem, ModuleSection } from "../constants/curriculumData";
import { cleanLessonTitle } from "./formatContent";

export type ItemStatus = "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED";
export type WeekStatus = "Completed" | "In progress" | "Up next" | "Locked" | "Not started";

export interface ItemStatusInfo {
  status: ItemStatus;
  isCompleted: boolean;
  isInProgress: boolean;
  isNotStarted: boolean;
  scoreText: string | null;
  submissionStateText: string | null;
  isOverdue: boolean;
}

export interface LiveSessionDetails {
  relativeText: string;
  isLiveNow: boolean;
  isUpcoming: boolean;
  isConcluded: boolean;
  userTimeZone: string;
  calendarUrl: string;
  meetUrl: string;
  hasRecording: boolean;
  recordingUrl?: string;
  dateFormatted: string;
  timeFormatted: string;
  liveBadgeText: string;
}

export interface WeekStats {
  module: ModuleSection;
  moduleIndex: number;
  weekNumber: number;
  formattedTitle: string;
  flowLessons: LessonItem[];
  folderLessons: LessonItem[];
  totalActivities: number;
  completedActivities: number;
  progressPercent: number;
  isCompleted: boolean;
  isInProgress: boolean;
  isLocked: boolean;
  isUpNext: boolean;
  status: WeekStatus;
  metaSummary: string; // e.g. "1 video · 2 quizzes · 1 lab · 1 live"
  estimatedTime: string; // e.g. "~3 hrs"
  liveSession: LiveSessionDetails | null;
  liveItem: LessonItem | null;
  nextIncompleteItem: LessonItem | null;
}

export interface CourseFlowStats {
  totalActivities: number;
  completedActivities: number;
  progressPercent: number;
  totalVideos: number;
  completedVideos: number;
  totalQuizzes: number;
  completedQuizzes: number;
  totalLabs: number;
  completedLabs: number;
  totalLive: number;
  completedLive: number;
  weekStats: WeekStats[];
  currentWeek: ModuleSection | null;
  currentWeekIndex: number;
  nextIncompleteItem: LessonItem | null;
  nextIncompleteWeek: ModuleSection | null;
  nextIncompleteLabel: string;
  upcomingLiveSession: {
    item: LessonItem;
    module: ModuleSection;
    details: LiveSessionDetails;
  } | null;
  isCourseCompleted: boolean;
}

/**
 * Standardize module/week title to consistent "Week X: Title" naming.
 */
export function formatWeekTitle(rawTitle: string, index: number): string {
  if (!rawTitle) return `Week ${index + 1}`;
  let clean = rawTitle.trim();
  // Strip existing "Module X:", "Week X:", "W1:", "1." prefixes
  clean = clean.replace(/^(?:Module|Week|W)?\s*\d+\s*[:.-]\s*/i, "");
  clean = clean.replace(/^\d+\s*[:.-]\s*/, "").trim();
  if (!clean) return `Week ${index + 1}`;
  return `Week ${index + 1}: ${clean}`;
}

/**
 * Categorize a lesson into one of the 4 unified activity flow types:
 * "video" | "quiz" | "lab" | "live" | "folder"
 */
export function getActivityType(item: any): "video" | "quiz" | "lab" | "live" | "folder" {
  if (!item) return "video";
  const cat = (item.category || "").toUpperCase();
  const type = (item.type || "").toLowerCase();

  if (cat === "FOLDER" || type === "folder" || item.folderId) return "folder";
  if (cat === "LIVE" || type === "live" || cat === "WORKSHOP" || type === "workshop" || item.id?.includes("_live")) {
    return "live";
  }
  if (
    cat === "QUIZ" ||
    cat === "ASSESSMENT" ||
    type === "quiz" ||
    item.id?.includes("_quiz") ||
    (Array.isArray(item.questions) && item.questions.length > 0 && type !== "assignment")
  ) {
    return "quiz";
  }
  if (
    cat === "ASSIGNMENT" ||
    cat === "TEST" ||
    cat === "PRACTICE" ||
    type === "assignment" ||
    type === "coding_test" ||
    type === "video_test" ||
    type === "subjective_test" ||
    type === "project" ||
    item.id?.includes("_code") ||
    item.id?.includes("_viva") ||
    item.id?.includes("_sub")
  ) {
    return "lab";
  }
  return "video";
}

/**
 * Determine per-item status, score, and submission info based on real API data.
 */
export function getItemStatus(
  item: LessonItem,
  completedLessonIds: string[],
  submissionsData: any[] = []
): ItemStatusInfo {
  const isCompleted = completedLessonIds.includes(item.id);
  const sub = Array.isArray(submissionsData)
    ? submissionsData.find((s: any) => s.lessonId === item.id || s.assignmentId === item.id)
    : null;

  let status: ItemStatus = "NOT_STARTED";
  let scoreText: string | null = null;
  let submissionStateText: string | null = null;

  if (isCompleted) {
    status = "COMPLETED";
  }

  const actType = getActivityType(item);

  if (actType === "quiz") {
    if (sub && sub.score !== null && sub.score !== undefined) {
      scoreText = `${sub.score}/${sub.maxScore || (item.questions?.length || 3)}`;
      status = "COMPLETED";
    }
  }

  if (actType === "lab") {
    if (sub) {
      if (sub.status === "GRADED") {
        submissionStateText = `Graded (${sub.score}/${sub.maxScore || 100})`;
        status = "COMPLETED";
      } else if (sub.status === "SUBMITTED" || sub.status === "UNDER_REVIEW") {
        submissionStateText = "Submitted";
        if (!isCompleted) status = "IN_PROGRESS";
      } else {
        submissionStateText = "In Progress";
        if (!isCompleted) status = "IN_PROGRESS";
      }
    } else {
      submissionStateText = "Not submitted";
    }
  }

  const isOverdue = !!(
    item.lockAt &&
    new Date(item.lockAt).getTime() < Date.now() &&
    status !== "COMPLETED"
  );

  return {
    status,
    isCompleted: status === "COMPLETED",
    isInProgress: status === "IN_PROGRESS",
    isNotStarted: status === "NOT_STARTED",
    scoreText,
    submissionStateText,
    isOverdue,
  };
}

/**
 * Compute schedule and timezone information for live sessions.
 */
export function getLiveSessionDetails(item: LessonItem): LiveSessionDetails {
  const userTimeZone =
    (typeof Intl !== "undefined" && Intl.DateTimeFormat().resolvedOptions().timeZone) || "UTC";
  const tzShort =
    (typeof Intl !== "undefined" &&
      new Date().toLocaleTimeString(undefined, { timeZoneName: "short" }).split(" ")[2]) ||
    "Local";

  let relativeText = item.liveDate
    ? `${item.liveDate}${item.liveTime ? ` at ${item.liveTime}` : ""}`
    : "Weekend Session";
  let dateFormatted = item.liveDate || "Weekend";
  let timeFormatted = item.liveTime || "6:00 PM";
  let liveBadgeText = item.liveDate || "Sat, 6 PM";

  let isLiveNow = false;
  let isUpcoming = false;
  let isConcluded = false;

  if (item.unlockAt) {
    const unlockDate = new Date(item.unlockAt);
    const now = new Date();
    const diffMs = unlockDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    dateFormatted = unlockDate.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    timeFormatted = unlockDate.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    liveBadgeText = `${dateFormatted}, ${timeFormatted}`;

    if (diffMs > 0) {
      isUpcoming = true;
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays <= 1 && unlockDate.getDate() === now.getDate()) {
        relativeText = `Today at ${timeFormatted} ${tzShort}`;
      } else if (diffDays <= 2) {
        relativeText = `Tomorrow at ${timeFormatted} ${tzShort}`;
      } else {
        relativeText = `Starts in ${diffDays} days (${dateFormatted})`;
      }
    } else {
      if (Math.abs(diffHours) < 3) {
        isLiveNow = true;
        relativeText = "Live Now";
      } else {
        isConcluded = true;
        relativeText = `Concluded on ${dateFormatted}`;
      }
    }
  } else if (item.liveDate) {
    isUpcoming = true;
  }

  // Google Calendar 1-Click Link
  const calStart = item.unlockAt
    ? new Date(item.unlockAt).toISOString().replace(/-|:|\.\d\d\d/g, "")
    : "";
  const calEnd = item.unlockAt
    ? new Date(new Date(item.unlockAt).getTime() + 2 * 60 * 60 * 1000)
        .toISOString()
        .replace(/-|:|\.\d\d\d/g, "")
    : "";
  const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    `${item.title} (Unisole Live Workshop)`
  )}${calStart ? `&dates=${calStart}/${calEnd}` : ""}&details=${encodeURIComponent(
    `Interactive Live Architectural Masterclass.\nMeeting URL: ${
      item.liveMeetingUrl || "https://meet.google.com/new"
    }`
  )}`;

  return {
    relativeText,
    isLiveNow,
    isUpcoming,
    isConcluded,
    userTimeZone: `${userTimeZone} (${tzShort})`,
    calendarUrl,
    meetUrl: item.liveMeetingUrl || "https://meet.google.com/new",
    hasRecording: !!item.videoUrl,
    recordingUrl: item.videoUrl,
    dateFormatted,
    timeFormatted,
    liveBadgeText,
  };
}

/**
 * Concise meta line for lesson rows.
 */
export function getItemMeta(item: LessonItem, statusInfo: ItemStatusInfo): string {
  const rawDur = item.duration || "15 min";
  const duration = rawDur
    .replace(/\s*Minutes?/i, " min")
    .replace(/\s*Mins?/i, " min");
  const parts: string[] = [duration];

  const actType = getActivityType(item);

  if (actType === "quiz") {
    const qCount = item.questions?.length || 3;
    parts.push(`${qCount} ${qCount === 1 ? "question" : "questions"}`);
    if (statusInfo.scoreText) {
      parts.push(`Score: ${statusInfo.scoreText}`);
    }
  } else if (actType === "lab") {
    if (statusInfo.submissionStateText) {
      parts.push(statusInfo.submissionStateText);
    } else {
      parts.push("Lab");
    }
  } else if (actType === "live") {
    parts.push("Live Workshop");
  }

  return parts.join(" · ");
}

/**
 * Compute detailed stats for a single week / module.
 */
export function getModuleStats(
  module: ModuleSection,
  moduleIndex: number,
  completedLessonIds: string[],
  submissionsData: any[] = [],
  isCurrentWeekCandidate = false
): WeekStats {
  const items = module.items || [];
  const folderLessons = items.filter((i) => getActivityType(i) === "folder");
  const flowLessons = items.filter((i) => getActivityType(i) !== "folder");

  const totalActivities = flowLessons.length;
  const completedActivities = flowLessons.filter((i) =>
    completedLessonIds.includes(i.id)
  ).length;

  const progressPercent =
    totalActivities > 0
      ? Math.round((completedActivities / totalActivities) * 100)
      : 0;

  const isCompleted = totalActivities > 0 && completedActivities === totalActivities;
  const isInProgress = completedActivities > 0 && !isCompleted;
  const isLocked = !!(
    module.isLocked ||
    (module.unlockAt && new Date(module.unlockAt).getTime() > Date.now())
  );

  let status: WeekStatus = "Not started";
  if (isLocked) {
    status = "Locked";
  } else if (isCompleted) {
    status = "Completed";
  } else if (isInProgress) {
    status = "In progress";
  } else if (isCurrentWeekCandidate) {
    status = "Up next";
  } else {
    status = "Not started";
  }

  // Activity breakdown counts
  let videos = 0;
  let quizzes = 0;
  let labs = 0;
  let lives = 0;
  let liveItem: LessonItem | null = null;
  let totalMinutes = 0;

  flowLessons.forEach((item) => {
    const actType = getActivityType(item);
    if (actType === "video") videos++;
    else if (actType === "quiz") quizzes++;
    else if (actType === "lab") labs++;
    else if (actType === "live") {
      lives++;
      if (!liveItem) liveItem = item;
    }

    if (item.duration) {
      const match = item.duration.match(/\d+/);
      if (match) totalMinutes += parseInt(match[0], 10);
    } else {
      totalMinutes += 30;
    }
  });

  const metaParts: string[] = [];
  if (videos > 0) metaParts.push(`${videos} ${videos === 1 ? "video" : "videos"}`);
  if (quizzes > 0) metaParts.push(`${quizzes} ${quizzes === 1 ? "quiz" : "quizzes"}`);
  if (labs > 0) metaParts.push(`${labs} ${labs === 1 ? "lab" : "labs"}`);
  if (lives > 0) metaParts.push(`${lives} live`);

  const metaSummary = metaParts.length > 0 ? metaParts.join(" · ") : `${totalActivities} activities`;

  const estimatedHours = Math.round((totalMinutes / 60) * 10) / 10;
  const estimatedTime =
    estimatedHours >= 1
      ? `~${Math.round(estimatedHours)} hrs`
      : `~${totalMinutes} mins`;

  const liveSession = liveItem ? getLiveSessionDetails(liveItem) : null;

  const nextIncompleteItem =
    flowLessons.find((item) => {
      const s = getItemStatus(item, completedLessonIds, submissionsData);
      return !s.isCompleted && !item.isLocked;
    }) || null;

  return {
    module,
    moduleIndex,
    weekNumber: moduleIndex + 1,
    formattedTitle: formatWeekTitle(module.title, moduleIndex),
    flowLessons,
    folderLessons,
    totalActivities,
    completedActivities,
    progressPercent,
    isCompleted,
    isInProgress,
    isLocked,
    isUpNext: status === "Up next",
    status,
    metaSummary,
    estimatedTime,
    liveSession,
    liveItem,
    nextIncompleteItem,
  };
}

/**
 * Unified course flow calculation across all weeks and lessons.
 * Keeps Overview and Week detail page in 100% agreement.
 */
export function getCourseFlowStats(
  modules: ModuleSection[],
  completedLessonIds: string[],
  submissionsData: any[] = []
): CourseFlowStats {
  if (!modules || modules.length === 0) {
    return {
      totalActivities: 0,
      completedActivities: 0,
      progressPercent: 0,
      totalVideos: 0,
      completedVideos: 0,
      totalQuizzes: 0,
      completedQuizzes: 0,
      totalLabs: 0,
      completedLabs: 0,
      totalLive: 0,
      completedLive: 0,
      weekStats: [],
      currentWeek: null,
      currentWeekIndex: 0,
      nextIncompleteItem: null,
      nextIncompleteWeek: null,
      nextIncompleteLabel: "Start Course",
      upcomingLiveSession: null,
      isCourseCompleted: false,
    };
  }

  // Identify current week candidate (first week not fully completed)
  let foundCurrentWeekIndex = -1;
  for (let idx = 0; idx < modules.length; idx++) {
    const mod = modules[idx];
    const flowItems = (mod.items || []).filter((i) => getActivityType(i) !== "folder");
    const isModDone =
      flowItems.length > 0 &&
      flowItems.every((i) => completedLessonIds.includes(i.id));
    if (!isModDone && foundCurrentWeekIndex === -1) {
      foundCurrentWeekIndex = idx;
      break;
    }
  }

  if (foundCurrentWeekIndex === -1) {
    foundCurrentWeekIndex = modules.length - 1; // All complete, point to last
  }

  const weekStats: WeekStats[] = modules.map((mod, idx) =>
    getModuleStats(
      mod,
      idx,
      completedLessonIds,
      submissionsData,
      idx === foundCurrentWeekIndex
    )
  );

  let totalActivities = 0;
  let completedActivities = 0;
  let totalVideos = 0;
  let completedVideos = 0;
  let totalQuizzes = 0;
  let completedQuizzes = 0;
  let totalLabs = 0;
  let completedLabs = 0;
  let totalLive = 0;
  let completedLive = 0;

  let nextIncompleteItem: LessonItem | null = null;
  let nextIncompleteWeek: ModuleSection | null = null;
  let nextIncompleteLabel = "Start Course";

  let upcomingLiveSession: {
    item: LessonItem;
    module: ModuleSection;
    details: LiveSessionDetails;
  } | null = null;

  weekStats.forEach((ws) => {
    ws.flowLessons.forEach((item) => {
      totalActivities++;
      const isDone = completedLessonIds.includes(item.id);
      if (isDone) completedActivities++;

      const actType = getActivityType(item);
      if (actType === "video") {
        totalVideos++;
        if (isDone) completedVideos++;
      } else if (actType === "quiz") {
        totalQuizzes++;
        if (isDone) completedQuizzes++;
      } else if (actType === "lab") {
        totalLabs++;
        if (isDone) completedLabs++;
      } else if (actType === "live") {
        totalLive++;
        if (isDone) completedLive++;
      }

      // Check first incomplete item across course
      if (!nextIncompleteItem && !isDone && !item.isLocked && !ws.isLocked) {
        nextIncompleteItem = item;
        nextIncompleteWeek = ws.module;
        const typeLabel =
          actType === "quiz"
            ? "Quiz"
            : actType === "lab"
            ? "Lab"
            : actType === "live"
            ? "Live Workshop"
            : "Lecture";
        nextIncompleteLabel = `Continue: Week ${ws.weekNumber} · ${typeLabel}`;
      }
    });

    // Find first upcoming or live workshop for top banner
    if (!upcomingLiveSession && ws.liveItem && ws.liveSession) {
      if (ws.liveSession.isLiveNow || ws.liveSession.isUpcoming) {
        upcomingLiveSession = {
          item: ws.liveItem,
          module: ws.module,
          details: ws.liveSession,
        };
      }
    }
  });

  const progressPercent =
    totalActivities > 0
      ? Math.round((completedActivities / totalActivities) * 100)
      : 0;

  const isCourseCompleted =
    totalActivities > 0 && completedActivities === totalActivities;

  if (isCourseCompleted) {
    nextIncompleteLabel = "Course Completed";
  } else if (!nextIncompleteItem && modules.length > 0 && modules[0]?.items?.[0]) {
    nextIncompleteItem = modules[0].items[0];
    nextIncompleteWeek = modules[0];
    nextIncompleteLabel = "Start Week 1";
  }

  const currentWeek = modules[foundCurrentWeekIndex] || modules[0] || null;

  return {
    totalActivities,
    completedActivities,
    progressPercent,
    totalVideos,
    completedVideos,
    totalQuizzes,
    completedQuizzes,
    totalLabs,
    completedLabs,
    totalLive,
    completedLive,
    weekStats,
    currentWeek,
    currentWeekIndex: foundCurrentWeekIndex,
    nextIncompleteItem,
    nextIncompleteWeek,
    nextIncompleteLabel,
    upcomingLiveSession,
    isCourseCompleted,
  };
}
