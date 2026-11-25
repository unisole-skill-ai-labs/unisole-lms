import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  Bell,
  FileQuestion,
  BookOpen,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Settings,
  Maximize2,
  ChevronLeft,
  X,
  Send,
  CheckCircle2,
  Users,
  ExternalLink,
  Bot,
  Sparkles,
  PlayCircle,
  FileText,
  SlidersHorizontal,
  Check,
  Award,
  AlertCircle,
  Code,
  Github,
  Plus,
  Edit3,
  Video as VideoIcon,
  Code2,
  MessageSquare,
  Folder,
  FolderOpen,
  FileArchive,
  Download,
  Layers,
  Lock,
  Calendar,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  Radio,
  Home,
  Compass,
} from "lucide-react";
import {
  useGetPathwayContentQuery,
  useGetLessonContentQuery,
  useGetStudentProgressQuery,
  useMarkLessonProgressMutation,
  useGetStudentSubmissionsQuery,
  useSubmitAssignmentMutation,
  useGetNotesQuery,
  useSaveNoteMutation,
  useGetCohortDataQuery,
  useGetStudentMentorQuery,
  useGetMentorCockpitQuery,
  useCreateCourseAssignmentMutation,
  useSubmitAssessmentTaskMutation,
  useGradeSubmissionMutation,
} from "../store/apiSlice";
import MilestonesModal from "../components/lms/MilestonesModal";
import NotFoundPage from "./NotFoundPage";
import CodingTestRunner from "../components/lms/CodingTestRunner";
import SubjectiveVideoTestRunner from "../components/lms/SubjectiveVideoTestRunner";
import Button from "../components/ui/Button";
import {
  getCurriculum,
  getEmbedVideoUrl,
  CourseCurriculum,
  ModuleSection,
  LessonItem,
  QuizQuestion,
} from "../constants/curriculumData";
import {
  saveSubmission,
  getSubmissionForLesson,
} from "../utils/submissionsStorage";
import { renderMarkdownToHtml, cleanLessonTitle } from "../utils/formatContent";
import { formatIstDisplay } from "../utils/timezone";
import {
  allowDevCurriculumFallback,
  filterVisibleModules,
  isStudentVisible,
} from "../utils/curriculumVisibility";
import {
  getCourseFlowStats,
  getItemStatus,
  getLiveSessionDetails,
  getItemMeta,
  formatWeekTitle,
  getActivityType,
  WeekStats,
  CourseFlowStats,
} from "../utils/courseFlow";

export default function LmsPlayerPage() {
  const { pathwayId: rawPathwayId } = useParams();
  const pathwayId = rawPathwayId === "course1" ? "cs-agentic" : rawPathwayId;
  const navigate = useNavigate();

  useEffect(() => {
    if (rawPathwayId === "course1") {
      navigate(`/learn/cs-agentic${window.location.search}`, { replace: true });
    }
  }, [rawPathwayId, navigate]);

  const allowCurriculumFallback = allowDevCurriculumFallback();

  // Active canonical curriculum fallback (only referenced when fallback is permitted)
  const canonical = useMemo(() => getCurriculum(pathwayId), [pathwayId]);

  const {
    data: pathwayData,
    isLoading: isPathwayLoading,
    error: pathwayError,
  } = useGetPathwayContentQuery(pathwayId, {
    skip: !pathwayId,
    refetchOnMountOrArgChange: true,
  });

  const pathway = pathwayData?.pathway;
  const courses = pathwayData?.courses || [];

  // Dynamic Course Title & Duration
  const courseTitle = pathway?.title || (allowCurriculumFallback ? canonical.title : "Course Curriculum");
  const courseEyebrow = allowCurriculumFallback ? canonical.eyebrow : "UNISOLE ACADEMIC CURRICULUM";

  // Build modules from backend DB or rich canonical curriculum
  // Build modules dynamically from backend DB API or fallback to canonical curriculum
  const modules: ModuleSection[] = useMemo(() => {
    const validCourseModules = filterVisibleModules(courses, pathwayId);

    if (validCourseModules.length > 0) {
      return validCourseModules.map((m: any, idx: number) => {
        const backendLessons = (m.lessons || []).filter(isStudentVisible);
        const liveCount = backendLessons.filter(
          (l: any) =>
            l.curriculumMode === "LIVE" ||
            l.type === "live" ||
            l.category === "LIVE" ||
            l.contentType === "LIVE" ||
            l.id?.includes("_live")
        ).length;
        const videoCount = backendLessons.filter(
          (l: any) =>
            l.contentType !== "QUIZ" &&
            l.contentType !== "ASSIGNMENT" &&
            l.curriculumMode !== "PRACTICE" &&
            l.curriculumMode !== "TEST" &&
            l.curriculumMode !== "FOLDER" &&
            l.curriculumMode !== "LIVE" &&
            l.type !== "quiz" &&
            l.type !== "assignment" &&
            l.type !== "coding_test" &&
            l.type !== "video_test" &&
            l.type !== "subjective_test" &&
            l.type !== "live" &&
            !l.id?.includes("_live")
        ).length;
        const assessCount = backendLessons.filter(
          (l: any) =>
            (l.contentType === "QUIZ" ||
            l.contentType === "ASSIGNMENT" ||
            l.curriculumMode === "PRACTICE" ||
            l.curriculumMode === "TEST" ||
            l.type === "quiz" ||
            l.type === "assignment" ||
            l.type === "coding_test" ||
            l.type === "video_test" ||
            l.type === "subjective_test") &&
            l.curriculumMode !== "LIVE" &&
            l.type !== "live" &&
            !l.id?.includes("_live")
        ).length;
        const metaParts: string[] = [];
        if (videoCount > 0) {
          metaParts.push(`${videoCount} ${videoCount === 1 ? "Video" : "Videos"}`);
        }
        if (assessCount > 0) {
          metaParts.push(`${assessCount} ${assessCount === 1 ? "Assessment" : "Assessments"}`);
        }
        if (liveCount > 0) {
          metaParts.push(`${liveCount} Live ${liveCount === 1 ? "Workshop" : "Workshops"}`);
        }
        if (metaParts.length === 0) {
          metaParts.push("4 Lessons");
        }
        const isModLocked = !!(m.isLocked || (m.unlockAt && new Date(m.unlockAt).getTime() > Date.now()));
        return {
          id: m.id || `mod-${idx}`,
          title: m.title || `Module ${idx + 1}`,
          meta: metaParts.join(" · "),
          unlockAt: m.unlockAt || null,
          lockAt: m.lockAt || null,
          isLocked: isModLocked,
          isScheduleLocked: !!(m.unlockAt && new Date(m.unlockAt).getTime() > Date.now()),
          items: backendLessons.map((l: any, lIdx: number) => {
            // Try parse structured json content if available
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
            const pracType = (l.practiceType || parsedContent?.practiceType || "").toUpperCase();
            const testType = (l.testType || parsedContent?.testType || "").toUpperCase();

            const isFolder =
              curMode === "FOLDER" ||
              cType === "FOLDER" ||
              parsedContent?.category === "FOLDER" ||
              (l.title && l.title.toLowerCase().includes("folder")) ||
              (l.title && l.title.includes("📁"));

            const isLive =
              !isFolder &&
              (curMode === "LIVE" ||
                cType === "LIVE" ||
                l.type === "live" ||
                l.category === "LIVE" ||
                parsedContent?.type === "live" ||
                parsedContent?.category === "LIVE" ||
                l.id?.includes("_live"));

            const isExplicitTest = !isFolder && !isLive && (curMode === "TEST" || parsedContent?.category === "TEST");
            const isExplicitPractice = !isFolder && !isLive && (curMode === "PRACTICE" || parsedContent?.category === "PRACTICE");

            const realVideoUrl = (l.videoUrl?.trim() || parsedContent?.videoUrl?.trim() || "");
            const hasRealVideo = !!(realVideoUrl && !realVideoUrl.includes("dQw4w9WgXcQ"));

            const isCoding =
              !isFolder &&
              !isLive &&
              isExplicitTest &&
              (testType === "CODING_TEST" || cType === "CODING_TEST" || l.id?.includes("_code"));

            const isVideoTest =
              !isFolder &&
              !isLive &&
              isExplicitTest &&
              (testType === "VIDEO_TEST" || cType === "VIDEO_TEST" || l.id?.includes("_viva"));

            const isSubjective =
              !isFolder &&
              !isLive &&
              isExplicitTest &&
              (testType === "SUBJECTIVE_TEST" || cType === "SUBJECTIVE_TEST" || l.id?.includes("_sub"));

            const isQuiz =
              !isFolder &&
              !isLive &&
              !isCoding &&
              !isVideoTest &&
              !isSubjective &&
              (isExplicitPractice || cType === "QUIZ" || pracType === "MCQ") &&
              (cType === "QUIZ" || pracType === "MCQ" || l.id?.includes("_quiz"));

            const isAssignment =
              !isFolder &&
              !isLive &&
              !isCoding &&
              !isVideoTest &&
              !isSubjective &&
              !isQuiz &&
              (cType === "ASSIGNMENT" || l.id?.includes("_assign"));

            const isLecture =
              !isFolder &&
              !isLive &&
              !isCoding &&
              !isVideoTest &&
              !isSubjective &&
              !isQuiz &&
              !isAssignment &&
              hasRealVideo &&
              (curMode === "LECTURE" || parsedContent?.category === "LECTURE" || cType === "VIDEO");

            // Questions
            const parsedQuestions: QuizQuestion[] | undefined =
              l.questions ||
              parsedContent?.quiz?.questions ||
              parsedContent?.questions;

            // Instructions / Description
            const parsedInstructions =
              l.instructions ||
              parsedContent?.assignment?.instructions ||
              parsedContent?.instructions ||
              l.description ||
              l.content;

            const codingConfig = l.codingTest || parsedContent?.codingTest;
            const subjectiveConfig = l.subjectiveTest || parsedContent?.subjectiveTest;
            const videoConfig = l.videoTest || parsedContent?.videoTest;
            const maxScore =
              codingConfig?.maxScore ||
              subjectiveConfig?.maxScore ||
              videoConfig?.maxScore ||
              l.assignment?.maxPoints ||
              parsedContent?.assignment?.maxPoints ||
              100;

            const resolvedType = isFolder
              ? ("folder" as const)
              : isLive
              ? ("live" as const)
              : isLecture
              ? ("video" as const)
              : isCoding
              ? ("coding_test" as const)
              : isVideoTest
              ? ("video_test" as const)
              : isSubjective
              ? ("subjective_test" as const)
              : isQuiz
              ? ("quiz" as const)
              : isAssignment
              ? ("assignment" as const)
              : ("reading" as const);

            const resolvedCategory = isFolder
              ? ("FOLDER" as const)
              : isLive
              ? ("LIVE" as const)
              : isLecture
              ? ("LECTURE" as const)
              : isExplicitTest || isCoding || isVideoTest || isSubjective
              ? ("TEST" as const)
              : isQuiz
              ? ("PRACTICE" as const)
              : ("READING" as const);

            const isLessonLocked = !!(
              l.isLocked ||
              l.isScheduleLocked ||
              (l.unlockAt && new Date(l.unlockAt).getTime() > Date.now()) ||
              isModLocked
            );

            return {
              id: l.id || `item-${idx}-${lIdx}`,
              title: l.title || `${idx + 1}.${lIdx + 1} Lesson`,
              duration: l.durationMinutes ? `${l.durationMinutes} Mins` : `${lIdx * 3 + 12} Mins`,
              type: resolvedType,
              category: resolvedCategory,
              unlockAt: l.unlockAt || null,
              lockAt: l.lockAt || null,
              isLocked: isLessonLocked,
              isScheduleLocked: !!(l.unlockAt && new Date(l.unlockAt).getTime() > Date.now()),
              folderId: l.folderId || parsedContent?.folderId || undefined,
              videoUrl: realVideoUrl,
              description: l.description || parsedContent?.contentMarkdown || l.content,
              questions: parsedQuestions,
              instructions: parsedInstructions,
              attachments: parsedContent?.attachments || l.attachments || [],
              maxScore,
              liveDate: l.liveDate || parsedContent?.liveDate,
              liveTime: l.liveTime || parsedContent?.liveTime,
              liveMeetingUrl: l.liveMeetingUrl || parsedContent?.liveMeetingUrl,
              mentorName: l.mentorName || parsedContent?.mentorName,
              config: {
                starterCode: codingConfig?.starterCode,
                language: codingConfig?.language || "python",
                testCases: codingConfig?.testCases,
                prompt: subjectiveConfig?.prompt || videoConfig?.prompt || parsedInstructions,
                rubrics: subjectiveConfig?.rubrics || videoConfig?.rubrics,
                maxDurationSec: videoConfig?.maxDurationSec,
                maxScore,
              },
            };
          }),
        };
      });
    }
    // Fallback to static curriculumData.ts is strictly permitted ONLY when allowCurriculumFallback is enabled
    if (allowCurriculumFallback && canonical.modules && canonical.modules.length > 0) {
      return canonical.modules;
    }
    return [];
  }, [courses, canonical, allowCurriculumFallback]);

  // Milestones & Mentorship State
  const [isMilestonesOpen, setIsMilestonesOpen] = useState(false);
  const { data: studentMentor } = useGetStudentMentorQuery(undefined);
  const [submitAssessmentTaskApi] = useSubmitAssessmentTaskMutation();

  // View state: "overview" (SS1) | "chapter" (SS2) | "player" (SS3)
  const [searchParams] = useSearchParams();
  const queryLessonId = searchParams.get("lesson");
  const queryModuleId = searchParams.get("module");

  const hasMatchingLesson = useMemo(() => {
    if (!queryLessonId || modules.length === 0) return true;
    return modules.some((m) => m.items?.some((i) => i.id === queryLessonId));
  }, [modules, queryLessonId]);

  const [currentView, setCurrentView] = useState<"overview" | "chapter" | "player">(
    () => (queryLessonId ? "player" : "overview")
  );
  const [selectedModule, setSelectedModule] = useState<ModuleSection>(modules[0]);
  const [selectedLesson, setSelectedLesson] = useState<LessonItem>(
    modules[0]?.items[0]
  );

  // Sync selected module/lesson if modules change
  useEffect(() => {
    if (modules.length > 0) {
      if (queryLessonId) {
        for (const mod of modules) {
          const found = mod.items?.find((item) => item.id === queryLessonId);
          if (found) {
            setSelectedModule(mod);
            setSelectedLesson(found);
            setCurrentView("player");
            return;
          }
        }
      } else {
        if (!selectedModule || !modules.some((m) => m.id === selectedModule.id)) {
          setSelectedModule(modules[0]);
          setSelectedLesson(modules[0].items[0]);
        }
      }
    }
  }, [modules, selectedModule, queryLessonId]);

  // Track student progress via backend API with local cache
  const { data: progressData } = useGetStudentProgressQuery(pathwayId);
  const [markLessonProgressApi] = useMarkLessonProgressMutation();
  const { data: submissionsData } = useGetStudentSubmissionsQuery(pathwayId);
  const [submitAssignmentApi] = useSubmitAssignmentMutation();

  const [localCompletedIds, setLocalCompletedIds] = useState<string[]>([]);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [isResourcesExpanded, setIsResourcesExpanded] = useState(false);

  const completedLessonIds: string[] = useMemo(() => {
    const fromServer = progressData?.completedLessonIds || [];
    return Array.from(new Set([...fromServer, ...localCompletedIds]));
  }, [progressData, localCompletedIds]);

  // Unified single source of truth for course progress and flow
  const courseFlow = useMemo(() => {
    return getCourseFlowStats(modules, completedLessonIds, submissionsData || []);
  }, [modules, completedLessonIds, submissionsData]);

  // Overview page: single open week accordion, week card refs, and scroll-collapse header
  const [openWeekId, setOpenWeekId] = useState<string | null>(null);
  const [hasUserToggled, setHasUserToggled] = useState(false);
  const currentWeekRef = useRef<HTMLDivElement | null>(null);
  const weekCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
  const isScrolledRef = useRef(false);
  const hasAutoScrolled = useRef(false);

  // Default on first load: the current week (first incomplete) is open and the others are closed. If every week is complete, all closed.
  useEffect(() => {
    if (!hasUserToggled && courseFlow.weekStats.length > 0) {
      const allCompleted = courseFlow.weekStats.every((ws) => ws.isCompleted);
      if (allCompleted) {
        setOpenWeekId(null);
      } else {
        const targetId = courseFlow.currentWeek?.id || courseFlow.weekStats[0]?.module.id;
        setOpenWeekId(targetId || null);
      }
    }
  }, [hasUserToggled, courseFlow.currentWeek?.id, courseFlow.weekStats]);

  // Accordion toggle: open selected week and close previous, or close if already open
  const handleToggleWeek = (weekId: string) => {
    setHasUserToggled(true);
    setOpenWeekId((prev) => {
      const nextId = prev === weekId ? null : weekId;
      if (nextId) {
        // Smoothly scroll into view just below sticky header only if its top is out of view
        requestAnimationFrame(() => {
          const el = weekCardRefs.current[nextId];
          if (el) {
            const rect = el.getBoundingClientRect();
            // Header is ~176px tall (nav 64 + course header 112)
            const stickyThreshold = 180;
            if (rect.top < stickyThreshold || rect.top > window.innerHeight - 100) {
              el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }
        });
      }
      return nextId;
    });
  };

  // Mobile scroll listener with hysteresis (collapse at > 80px, expand at < 20px) to eliminate feedback flicker
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const y = window.scrollY;
          if (y > 80 && !isScrolledRef.current) {
            isScrolledRef.current = true;
            setIsHeaderScrolled(true);
          } else if (y < 20 && isScrolledRef.current) {
            isScrolledRef.current = false;
            setIsHeaderScrolled(false);
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-scroll to current week on initial overview load (canceled if user manually scrolls)
  useEffect(() => {
    if (currentView === "overview" && currentWeekRef.current && !hasAutoScrolled.current) {
      const cancelAutoScroll = () => {
        hasAutoScrolled.current = true;
      };
      window.addEventListener("wheel", cancelAutoScroll, { passive: true, once: true });
      window.addEventListener("touchstart", cancelAutoScroll, { passive: true, once: true });

      const timer = setTimeout(() => {
        if (!hasAutoScrolled.current && currentWeekRef.current) {
          hasAutoScrolled.current = true;
          currentWeekRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 350);

      return () => {
        clearTimeout(timer);
        window.removeEventListener("wheel", cancelAutoScroll);
        window.removeEventListener("touchstart", cancelAutoScroll);
      };
    }
  }, [currentView, courseFlow.currentWeek?.id]);

  const markLessonComplete = async (lessonId: string) => {
    setLocalCompletedIds((prev) => (prev.includes(lessonId) ? prev : [...prev, lessonId]));
    try {
      await markLessonProgressApi({
        lessonId,
        pathwayId,
        isCompleted: true,
      }).unwrap();
    } catch {
      // Fallback
    }
  };


  const moduleBackLabel = useMemo(() => {
    if (!selectedModule) return "Back to Course";
    const modIdx = modules.findIndex((m) => m.id === selectedModule.id);
    if (modIdx !== -1) return `Back to Week ${modIdx + 1}`;
    const match = selectedModule.title?.match(/Week\s*(\d+)/i);
    if (match) return `Back to Week ${match[1]}`;
    return `Back to ${selectedModule.title || "Module"}`;
  }, [selectedModule, modules]);

  const handleBackToModule = () => {
    if (selectedModule?.id) {
      navigate(`/learn/${pathwayId}/module/${selectedModule.id}`);
    } else {
      navigate(`/learn/${pathwayId}`);
    }
  };

  // Tabs on Player: "notes" | "help"
  const [playerTab, setPlayerTab] = useState<"notes" | "help">("help");

  // Interactive Quiz State
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);

  // Lesson Type Resolution Flags
  const hasRealVideo = !!(
    selectedLesson?.videoUrl?.trim() &&
    !selectedLesson.videoUrl.includes("dQw4w9WgXcQ") &&
    getEmbedVideoUrl(selectedLesson.videoUrl)
  );
  const isFolder = selectedLesson?.type === "folder" || (selectedLesson as any)?.category === "FOLDER";
  const isLive = !isFolder && (selectedLesson?.type === "live" || (selectedLesson as any)?.category === "LIVE");
  const isVideo = !isFolder && !isLive && hasRealVideo && (selectedLesson?.type === "video" || (selectedLesson as any)?.category === "LECTURE");
  const isQuiz = !isFolder && !isLive && !isVideo && (selectedLesson?.type === "quiz" || ((selectedLesson as any)?.questions?.length > 0 && selectedLesson?.type !== "assignment"));
  const isCodingTest =
    !isFolder &&
    !isLive &&
    !isVideo &&
    !isQuiz &&
    ((selectedLesson as any)?.type === "coding_test" ||
    (selectedLesson as any)?.type === "code" ||
    ((selectedLesson as any)?.category === "TEST" && (selectedLesson as any)?.type === "code"));
  const isSubjectiveOrVideoTest =
    !isFolder &&
    !isLive &&
    !isVideo &&
    !isQuiz &&
    !isCodingTest &&
    ((selectedLesson as any)?.type === "subjective_test" ||
    (selectedLesson as any)?.type === "video_test" ||
    ((selectedLesson as any)?.category === "TEST" && ((selectedLesson as any)?.type === "video_test" || (selectedLesson as any)?.type === "subjective_test")));
  const isAssignment =
    !isFolder &&
    !isLive &&
    !isVideo &&
    !isQuiz &&
    !isCodingTest &&
    !isSubjectiveOrVideoTest &&
    ((selectedLesson as any)?.type === "assignment" || (selectedLesson as any)?.type === "lab");
  const isReading =
    !isFolder &&
    !isLive &&
    !isVideo &&
    !isQuiz &&
    !isCodingTest &&
    !isSubjectiveOrVideoTest &&
    !isAssignment;

  // Reset quiz state when switching lessons
  useEffect(() => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
    setAssignmentSubmitted(false);
  }, [selectedLesson?.id]);

  // Interactive Lab Assignment State
  const [assignmentRepoUrl, setAssignmentRepoUrl] = useState("");
  const [assignmentNotes, setAssignmentNotes] = useState("");
  const [assignmentSubmitted, setAssignmentSubmitted] = useState(false);

  // Existing submission check from backend API
  useEffect(() => {
    if (selectedLesson && (selectedLesson.type === "assignment" || isAssignment)) {
      const existing = (submissionsData || []).find((s: any) => s.lessonId === selectedLesson.id || s.assignmentId === selectedLesson.id);
      if (existing) {
        setAssignmentSubmitted(true);
        setAssignmentRepoUrl(existing.submissionUrl || "");
        setAssignmentNotes(existing.submissionText || "");
      } else {
        const local = getSubmissionForLesson(selectedLesson.id);
        if (local) {
          setAssignmentSubmitted(true);
          setAssignmentRepoUrl(local.submissionUrl);
          setAssignmentNotes(local.submissionText || "");
        } else {
          setAssignmentSubmitted(false);
          setAssignmentRepoUrl("");
          setAssignmentNotes("");
        }
      }
    }
  }, [selectedLesson, submissionsData, isAssignment]);

  // Notes state & Backend persistence
  const { data: notesData = [] } = useGetNotesQuery(pathwayId);
  const [saveNoteApi] = useSaveNoteMutation();
  const { data: cohortData } = useGetCohortDataQuery(pathwayId);

  const [userNotes, setUserNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);

  // Sync userNotes with backend note when switching lessons
  useEffect(() => {
    if (selectedLesson && notesData) {
      const match = notesData.find((n: any) => n.lessonId === selectedLesson.id);
      setUserNotes(match?.content || "");
    }
  }, [selectedLesson?.id, notesData]);

  const handleSaveNote = async () => {
    if (!selectedLesson || !userNotes.trim()) return;
    try {
      await saveNoteApi({
        lessonId: selectedLesson.id,
        pathwayId,
        lessonTitle: selectedLesson.title,
        content: userNotes.trim(),
      }).unwrap();
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2500);
    } catch {
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    }
  };

  // Support Ticket Modal
  const [supportTicketOpen, setSupportTicketOpen] = useState(false);

  // All lessons flat array for navigation
  const allLessonItems = useMemo(() => {
    return modules.flatMap((m) => m.items);
  }, [modules]);

  const currentLessonIndex = allLessonItems.findIndex((l) => l.id === selectedLesson?.id);
  const hasPrevious = currentLessonIndex > 0;
  const hasNext = currentLessonIndex >= 0 && currentLessonIndex < allLessonItems.length - 1;

  const handlePreviousLesson = () => {
    if (hasPrevious) {
      setSelectedLesson(allLessonItems[currentLessonIndex - 1]);
    }
  };

  const handleNextLesson = () => {
    if (hasNext) {
      setSelectedLesson(allLessonItems[currentLessonIndex + 1]);
    }
  };

  // Progress metrics & Diagram Taxonomy (strictly based on actual created course content)
  const actionableLessons = useMemo(() => {
    return allLessonItems.filter((l) => l.type !== "folder" && (l as any).category !== "FOLDER");
  }, [allLessonItems]);

  const totalLessons = courseFlow.totalActivities;
  const completedLessonsInCourse = useMemo(() => {
    return actionableLessons.filter((l) => completedLessonIds.includes(l.id));
  }, [actionableLessons, completedLessonIds]);
  const completedCount = courseFlow.completedActivities;
  const progressPercent = courseFlow.progressPercent;

  // Breakdown of actual content types from courseFlow
  const totalVideos = courseFlow.totalVideos;
  const completedVideos = courseFlow.completedVideos;
  const totalAssessments = courseFlow.totalQuizzes + courseFlow.totalLabs;
  const completedAssessments = courseFlow.completedQuizzes + courseFlow.completedLabs;
  const assessmentItems = useMemo(() => {
    return actionableLessons.filter(
      (l) =>
        getActivityType(l) === "quiz" ||
        getActivityType(l) === "lab"
    );
  }, [actionableLessons]);

  const maxMarks = useMemo(() => {
    return assessmentItems.reduce((acc, l) => acc + ((l as any).maxScore || 10), 0);
  }, [assessmentItems]);

  const currentMarks = useMemo(() => {
    return assessmentItems
      .filter((l) => completedLessonIds.includes(l.id))
      .reduce((acc, l) => acc + ((l as any).maxScore || 10), 0);
  }, [assessmentItems, completedLessonIds]);

  // Dynamic syllabus summary text (1 line as required: "2% complete · 1 of 48 activities")
  const statsSummary = useMemo(() => {
    if (totalLessons === 0) {
      return "Curriculum in preparation · 0 / 0 Completed";
    }
    return `${progressPercent}% complete · ${completedCount} of ${totalLessons} activities`;
  }, [totalLessons, progressPercent, completedCount]);

  // Contextual status badge (replaces false "AT RISK" on new/empty courses)
  const statusBadge = useMemo(() => {
    if (totalLessons === 0) {
      return {
        label: "IN PREPARATION",
        className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      };
    }
    if (completedCount === totalLessons) {
      return {
        label: "COMPLETED",
        className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      };
    }
    if (completedCount === 0) {
      return {
        label: "NOT STARTED",
        className: "bg-sky-500/10 text-sky-400 border-sky-500/20",
      };
    }
    if (progressPercent >= 70) {
      return {
        label: "ON TRACK",
        className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      };
    }
    return {
      label: "IN PROGRESS",
      className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    };
  }, [totalLessons, completedCount, progressPercent]);

  // Full milestone list for modal and diamond tracker
  const milestoneList = useMemo(() => {
    const list: any[] = [];
    modules.forEach((mod) => {
      mod.items.forEach((item) => {
        const isAssess =
          item.type === "quiz" ||
          item.type === "assignment" ||
          (item as any).category === "PRACTICE" ||
          (item as any).category === "TEST";
        if (isAssess) {
          list.push({
            id: item.id,
            title: item.title,
            category: (((item as any).category || (item.type === "quiz" ? "PRACTICE" : "TEST")) as "PRACTICE" | "TEST"),
            type: (((item as any).type || (item.type === "quiz" ? "MCQ" : "PROJECT")) as any),
            maxScore: (item as any).maxScore || 10,
            week: mod.title,
            isCompleted: completedLessonIds.includes(item.id),
          });
        }
      });
    });
    return list;
  }, [modules, completedLessonIds]);

  // Handle Quiz Submission
  const handleQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLesson.questions || selectedLesson.questions.length === 0) return;

    let correct = 0;
    selectedLesson.questions.forEach((q) => {
      if (quizAnswers[q.id] === q.correctOptionIndex) {
        correct++;
      }
    });

    const percent = Math.round((correct / selectedLesson.questions.length) * 100);
    setQuizScore(percent);
    setQuizSubmitted(true);

    const answersBreakdown = (selectedLesson.questions || [])
      .map((q, idx) => {
        const userOptIdx = quizAnswers[q.id];
        const userSelectedText =
          userOptIdx !== undefined && q.options[userOptIdx] ? q.options[userOptIdx] : "Not selected";
        const isCorrect = userOptIdx === q.correctOptionIndex;
        return `Question ${idx + 1}: ${q.question}\n• Student Selected: ${userSelectedText} ${isCorrect ? "✓ (Correct)" : "✗ (Incorrect)"}`;
      })
      .join("\n\n");

    try {
      await submitAssignmentApi({
        lessonId: selectedLesson.id,
        pathwayId,
        type: "quiz",
        title: selectedLesson.title,
        submissionText: answersBreakdown,
        score: percent,
        status: "COMPLETED",
      }).unwrap();
    } catch {
      // Fallback
    }

    saveSubmission({
      assignmentId: selectedLesson.id,
      courseTitle: courseTitle,
      lessonTitle: selectedLesson.title,
      submissionText: answersBreakdown,
      submissionUrl: "",
    });

    markLessonComplete(selectedLesson.id);
  };

  // Handle Assignment Submission
  const handleAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentRepoUrl.trim()) return;

    try {
      await submitAssignmentApi({
        lessonId: selectedLesson.id,
        pathwayId,
        type: "assignment",
        title: selectedLesson.title,
        submissionUrl: assignmentRepoUrl.trim(),
        submissionText: assignmentNotes.trim(),
        status: "SUBMITTED",
      }).unwrap();
    } catch {
      // Fallback
    }

    saveSubmission({
      assignmentId: selectedLesson.id,
      courseTitle: courseTitle,
      lessonTitle: selectedLesson.title,
      submissionUrl: assignmentRepoUrl.trim(),
      submissionText: assignmentNotes.trim(),
    });

    setAssignmentSubmitted(true);
    markLessonComplete(selectedLesson.id);
  };


  // -------------------------------------------------------------
  // Error & Loading States (Skeleton Loaders as required by Part C)
  // -------------------------------------------------------------
  if (pathwayError && !pathwayData) {
    const errorStatus = (pathwayError as any)?.status;
    if (errorStatus === 404) {
      return <NotFoundPage />;
    }
    if (errorStatus === 403) {
      return (
        <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center p-4">
          <div className="text-center space-y-4 max-w-md bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-8 shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
              You're not enrolled in this course
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              You do not have an active enrollment for this curriculum track. Explore available programs or return to your dashboard.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <Link to="/dashboard">
                <Button variant="primary" size="sm" icon={Home}>
                  Back to Dashboard
                </Button>
              </Link>
              <Link to="/enrolled">
                <Button variant="outline" size="sm" icon={Compass}>
                  My Learning
                </Button>
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-8 bg-white dark:bg-[#070A11]">
        <div className="text-center space-y-3 max-w-md">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Unable to load course curriculum
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Please check your network connection or try reloading the curriculum.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-sm cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isPathwayLoading && !pathwayData) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-white dark:bg-[#070A11] p-4 sm:p-6 space-y-6 animate-pulse max-w-3xl lg:max-w-4xl mx-auto">
        {/* Header Skeleton */}
        <div className="h-32 bg-slate-100 dark:bg-slate-900 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="w-3/4 h-6 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full" />
        </div>
        {/* Week Cards Skeleton */}
        <div className="space-y-3.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 bg-slate-100 dark:bg-slate-900 rounded-2xl p-4 flex items-center justify-between"
            >
              <div className="space-y-2 flex-1">
                <div className="w-1/2 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="w-1/3 h-3 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
              <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Clean "Content Coming Soon" state when DB returns no modules (e.g. in production before instructor authoring)
  if (!isPathwayLoading && modules.length === 0) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 dark:text-blue-400">
          <BookOpen className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Content Coming Soon
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Curriculum modules and learning resources for{" "}
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">{courseTitle}</span> are being authored by
            course instructors. Please check back shortly.
          </p>
        </div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    );
  }

  // Invalid or foreign lesson id -> 404
  if (!isPathwayLoading && queryLessonId && !hasMatchingLesson) {
    return <NotFoundPage />;
  }

  // -------------------------------------------------------------
  // VIEW 1: Course Overview (Connected Mobile-First Learning Flow)
  // -------------------------------------------------------------
  if (currentView === "overview") {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-white dark:bg-[#070A11] flex flex-col justify-between pb-24 sm:pb-16">
        {/* Cosmic Midnight Navy Banner Header (A1) - Fixed Layout Height with Transform/Opacity Visual Collapse */}
        <div
          data-testid="course-sticky-header"
          style={{ top: "calc(var(--nav-h, 4rem) + env(safe-area-inset-top, 0px))" }}
          className="bg-gradient-to-br from-[#070A11] via-[#0B1120] to-[#0D1D38] border-b border-sky-500/20 text-white sticky z-30 shadow-md backdrop-blur-md h-[104px] sm:h-[112px] flex flex-col justify-center overflow-hidden"
        >
          <div className="max-w-3xl lg:max-w-4xl mx-auto px-4 sm:px-6 w-full space-y-2">
            {/* Top Navigation Row */}
            <div className="flex items-center justify-between gap-3 h-8">
              <button
                onClick={() => navigate("/enrolled")}
                aria-label="Back to my courses"
                className="inline-flex items-center gap-1.5 p-1.5 -ml-1.5 rounded-full text-white/90 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0 text-xs font-semibold min-h-[44px] min-w-[44px]"
              >
                <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
                <span className="hidden sm:inline">Back to my courses</span>
              </button>
              <div className="flex-1 min-w-0">
                <h2
                  className={`text-xs sm:text-sm font-bold text-white truncate transition-all duration-200 ${
                    isHeaderScrolled
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 -translate-y-1 pointer-events-none"
                  }`}
                >
                  {courseTitle}
                </h2>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => navigate("/")}
                  aria-label="Search curriculum"
                  className="p-1.5 -mr-1.5 rounded-full text-white/90 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Search className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* Title & Stats Row (visually collapses via transform/opacity without changing layout height) */}
            <div className="relative h-6">
              <div
                className={`absolute inset-0 flex items-center justify-between gap-3 transition-all duration-200 ${
                  isHeaderScrolled
                    ? "opacity-0 -translate-y-2 pointer-events-none"
                    : "opacity-100 translate-y-0"
                }`}
              >
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-white truncate">
                  {courseTitle}
                </h1>
                <p className="text-[11px] text-sky-200/90 font-medium shrink-0 font-mono">
                  {statsSummary}
                </p>
              </div>
            </div>

            {/* Progress Bar with Percentage placed directly next to the bar (A1) */}
            <div className="flex items-center gap-2.5 h-4">
              <span className="text-xs font-bold text-sky-400 font-mono shrink-0">
                {courseFlow.progressPercent}%
              </span>
              <div className="flex-1 h-2 bg-slate-800/90 rounded-full overflow-hidden border border-slate-700/50">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-blue-500 rounded-full transition-all duration-500 shadow-sm shadow-sky-400/50"
                  style={{ width: `${courseFlow.progressPercent}%` }}
                />
              </div>
              <span className="text-[11px] font-semibold text-slate-300 shrink-0 font-mono">
                {courseFlow.completedActivities} of {courseFlow.totalActivities}
              </span>
            </div>
          </div>
        </div>

        {/* Course Curriculum Weeks List (A2 & A3) */}
        <div className="max-w-3xl lg:max-w-4xl mx-auto px-4 sm:px-6 py-6 w-full flex-1">
            {courseFlow.weekStats.length === 0 ? (
              <div className="bg-white dark:bg-[#0B1120] rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
                <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto stroke-[1.5]" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Curriculum Under Preparation
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Lessons and assessments for this course will appear here once published by the instructor in the Course Studio.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                {courseFlow.weekStats.map((ws) => {
                  const isCurrentWeek = ws.module.id === courseFlow.currentWeek?.id;
                  const isLocked = ws.isLocked;

                  return (
                    <div
                      key={ws.module.id}
                      data-testid="module-card"
                      onClick={() => {
                        if (!isLocked) {
                          navigate(`/learn/${pathwayId}/module/${ws.module.id}`);
                        }
                      }}
                      className={`rounded-2xl border p-4 sm:p-5 transition-all duration-150 overflow-hidden shadow-2xs ${
                        isLocked
                          ? "bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-70 cursor-not-allowed"
                          : isCurrentWeek
                          ? "border-sky-500 dark:border-sky-500 ring-2 ring-sky-500/20 bg-white dark:bg-[#0B1120] hover:border-sky-400 cursor-pointer"
                          : ws.isCompleted
                          ? "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#070D18]/70 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] hover:border-sky-400 dark:hover:border-sky-500/60 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1 space-y-2">
                          {/* Title and Badges */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3
                              className={`text-sm sm:text-base font-bold truncate ${
                                isCurrentWeek
                                  ? "text-sky-600 dark:text-sky-400 font-extrabold"
                                  : "text-slate-900 dark:text-slate-100"
                              }`}
                            >
                              {ws.formattedTitle}
                            </h3>

                            {ws.isCompleted ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                <span>Completed</span>
                              </span>
                            ) : isLocked ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                <Lock className="w-2.5 h-2.5" />
                                <span>
                                  Locked
                                  {ws.module.unlockAt
                                    ? ` · Unlocks on ${formatIstDisplay(ws.module.unlockAt)}`
                                    : ""}
                                </span>
                              </span>
                            ) : ws.isInProgress ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                In progress
                              </span>
                            ) : isCurrentWeek ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                                Up next
                              </span>
                            ) : null}
                          </div>

                          {/* Progress bar and count */}
                          {!isLocked && ws.totalActivities > 0 && (
                            <div className="flex items-center gap-3">
                              <div className="w-24 sm:w-32 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-sky-500 rounded-full transition-all"
                                  style={{ width: `${ws.progressPercent}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 font-mono">
                                {ws.completedActivities}/{ws.totalActivities} activities done ({ws.progressPercent}%)
                              </span>
                            </div>
                          )}

                          {/* Meta Line */}
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            <span>{ws.metaSummary}</span>
                            {ws.liveSession && (
                              <>
                                <span className="text-slate-300 dark:text-slate-600"> • </span>
                                <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                                  Live: {ws.liveSession.liveBadgeText}
                                </span>
                              </>
                            )}
                          </p>
                        </div>

                        {/* Right: Lock icon or Chevron */}
                        <div className="shrink-0 flex items-center">
                          {isLocked ? (
                            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400">
                              <Lock className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="p-2 rounded-xl text-slate-400 group-hover:text-sky-500 transition-colors">
                              <ChevronRight className="w-5 h-5 transition-transform" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        {/* Certificate Bar (if course completed) */}
        {courseFlow.isCourseCompleted && pathway?.certificateUrl && (
          <div className="fixed sm:sticky bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 py-3 px-4 shadow-lg">
            <div className="max-w-3xl lg:max-w-4xl mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Course Completed!</span>
              </div>
              <a
                href={pathway.certificateUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Award className="w-4 h-4" />
                <span>View Certificate</span>
              </a>
            </div>
          </div>
        )}

        {/* Milestones Modal & Author Studio Drawer */}
        <MilestonesModal
          isOpen={isMilestonesOpen}
          onClose={() => setIsMilestonesOpen(false)}
          milestones={milestoneList}
          completedIds={completedLessonIds}
          onSelectMilestone={(item) => {
            const mod = modules.find((m) => m.items.some((i) => i.id === item.id)) || modules[0];
            const les = mod.items.find((i) => i.id === item.id) || mod.items[0];
            setSelectedModule(mod);
            setSelectedLesson(les);
            setCurrentView("player");
          }}
        />
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: Chapter Details / Week Breakdown (Mobile-First Unisole Sky Theme)
  // -------------------------------------------------------------
  if (currentView === "chapter") {
    if (selectedModule?.id) {
      navigate(`/learn/${pathwayId}/module/${selectedModule.id}`, { replace: true });
      return null;
    }
    const currentModuleIndex = modules.findIndex((m) => m.id === selectedModule?.id);
    const prevModule = currentModuleIndex > 0 ? modules[currentModuleIndex - 1] : null;
    const nextModule =
      currentModuleIndex >= 0 && currentModuleIndex < modules.length - 1
        ? modules[currentModuleIndex + 1]
        : null;

    const folderLessons =
      selectedModule?.items.filter((i) => i.category === "FOLDER" || i.type === "folder") || [];
    const flowLessons =
      selectedModule?.items.filter(
        (i) => i.category !== "FOLDER" && i.type !== "folder" && !i.folderId
      ) || [];

    const totalModuleLessons = flowLessons.length;
    const completedModuleLessons = flowLessons.filter((i) =>
      completedLessonIds.includes(i.id)
    ).length;
    const moduleProgressPercent =
      totalModuleLessons > 0
        ? Math.round((completedModuleLessons / totalModuleLessons) * 100)
        : 0;

    const checkItemStatus = (item: any) =>
      getItemStatus(item, completedLessonIds, submissionsData || []);

    // First incomplete item in recommended flow
    const nextIncompleteItem =
      flowLessons.find((item) => {
        const s = checkItemStatus(item);
        return !s.isCompleted && !item.isLocked;
      }) || null;

    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#F8FAFC] dark:bg-[#070A11] text-slate-900 dark:text-slate-100 pb-28 sm:pb-12">
        {/* Header Bar with Week Switcher and Progress Bar */}
        <div
          style={{ top: "calc(var(--nav-h, 4rem) + env(safe-area-inset-top, 0px))" }}
          className="bg-white/95 dark:bg-[#0B1120]/95 border-b border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white sticky z-30 shadow-xs backdrop-blur-md"
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 space-y-2.5">
            {/* Top Navigation Row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <button
                  onClick={() => setCurrentView("overview")}
                  aria-label="Back to Course Overview"
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-slate-700/80 transition-all cursor-pointer shrink-0"
                >
                  <ArrowLeft className="w-4 h-4 stroke-[2.2]" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400 shrink-0">
                      Curriculum Module
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                      • Week {currentModuleIndex + 1} of {modules.length}
                    </span>
                  </div>
                  <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                    {formatWeekTitle(selectedModule?.title || "Curriculum Module", currentModuleIndex)}
                  </h1>
                </div>
              </div>

              {/* Compact Week Switcher */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (prevModule) {
                      setSelectedModule(prevModule);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                  disabled={!prevModule}
                  aria-label="Previous week"
                  title={prevModule ? `Previous: ${formatWeekTitle(prevModule.title, currentModuleIndex - 1)}` : "First week"}
                  className={`p-1.5 sm:px-2.5 sm:py-1 rounded-xl border text-xs flex items-center gap-1 transition-all ${
                    prevModule
                      ? "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 cursor-pointer"
                      : "opacity-40 text-slate-400 border-transparent cursor-not-allowed"
                  }`}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline font-semibold">Prev</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (nextModule) {
                      setSelectedModule(nextModule);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                  disabled={!nextModule}
                  aria-label="Next week"
                  title={nextModule ? `Next: ${formatWeekTitle(nextModule.title, currentModuleIndex + 1)}` : "Last week"}
                  className={`p-1.5 sm:px-2.5 sm:py-1 rounded-xl border text-xs flex items-center gap-1 transition-all ${
                    nextModule
                      ? "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 cursor-pointer"
                      : "opacity-40 text-slate-400 border-transparent cursor-not-allowed"
                  }`}
                >
                  <span className="hidden sm:inline font-semibold">Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Header Progress Bar and Progress Text */}
            <div className="space-y-1 pt-0.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <span>
                  {completedModuleLessons} of {totalModuleLessons} completed
                </span>
                <span className="font-bold text-sky-600 dark:text-sky-400">
                  {moduleProgressPercent}%
                </span>
              </div>
              <div className="w-full bg-slate-200/80 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-sky-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${moduleProgressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content Area with Responsive Container */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Optional Week Summary Block (Collapsible) */}
          {(selectedModule as any)?.description && (
            <div className="bg-white dark:bg-[#0B1120] rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                className="w-full px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between text-left hover:bg-slate-50/60 dark:hover:bg-[#0E1726] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    What you'll learn in this week
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                  <span className="hidden sm:inline">{isSummaryExpanded ? "Hide" : "Show"}</span>
                  {isSummaryExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>
              {isSummaryExpanded && (
                <div className="px-4 pb-4 sm:px-5 sm:pb-4 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {(selectedModule as any).description}
                </div>
              )}
            </div>
          )}

          {/* Unified Recommended Learning Flow */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Recommended Learning Flow
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {flowLessons.length} Steps
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                Sequence: Lecture → Quiz → Assignment → Live Workshop
              </span>
            </div>

            {flowLessons.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-[#0B1120] rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  No learning activities scheduled for this module yet.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {flowLessons.map((item: any, idx: number) => {
                  const itemState = checkItemStatus(item);
                  const isDone = itemState.isCompleted;
                  const isInProgress = itemState.isInProgress;
                  const isNext = nextIncompleteItem?.id === item.id;
                  const stepNum = idx + 1;

                  const actType = getActivityType(item);
                  const isVideo = actType === "video";
                  const isQuiz = actType === "quiz";
                  const isAssignment = actType === "lab";
                  const isLive = actType === "live";

                  const liveInfo = isLive ? getLiveSessionDetails(item) : null;
                  const metaText = getItemMeta(item, itemState);
                  const isOverdue = itemState.isOverdue;

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (item.isLocked) return;
                        setSelectedLesson(item);
                        setCurrentView("player");
                      }}
                      className={`group relative rounded-xl border p-3.5 sm:p-4 transition-colors duration-150 shadow-2xs hover:shadow-xs flex items-center justify-between min-h-[56px] ${
                        item.isLocked
                          ? "opacity-60 bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 cursor-not-allowed"
                          : isNext
                          ? "bg-sky-50/40 dark:bg-sky-950/20 border-sky-500/80 dark:border-sky-500/80 ring-2 ring-sky-500/20 cursor-pointer"
                          : "bg-white dark:bg-[#0B1120] hover:bg-slate-50/80 dark:hover:bg-[#0E1726] border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer"
                      }`}
                    >
                      {/* Left: Step number, Status icon, Type icon, and Titles */}
                      <div className="flex items-center gap-3 min-w-0 pr-2 flex-1">
                        {/* Step Number Badge */}
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            isDone
                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                              : isNext
                              ? "bg-sky-600 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {stepNum}
                        </div>

                        {/* Status Icon */}
                        <div className="shrink-0">
                          {isDone ? (
                            <CheckCircle2
                              className="w-5 h-5 text-emerald-500"
                              aria-label="Completed"
                            />
                          ) : isInProgress ? (
                            <Clock
                              className="w-5 h-5 text-amber-500"
                              aria-label="In Progress"
                            />
                          ) : (
                            <Circle
                              className="w-5 h-5 text-slate-300 dark:text-slate-600"
                              aria-label="Not Started"
                            />
                          )}
                        </div>

                        {/* Type Icon Badge */}
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isVideo
                              ? "bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/60"
                              : isQuiz
                              ? "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60"
                              : isAssignment
                              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60"
                              : isLive
                              ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60"
                              : "bg-slate-50 dark:bg-slate-900 text-slate-600 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {isVideo ? (
                            <PlayCircle className="w-4 h-4 stroke-[2]" />
                          ) : isQuiz ? (
                            <FileQuestion className="w-4 h-4 stroke-[2]" />
                          ) : isAssignment ? (
                            <Code2 className="w-4 h-4 stroke-[2]" />
                          ) : isLive ? (
                            <VideoIcon className="w-4 h-4 stroke-[2]" />
                          ) : (
                            <BookOpen className="w-4 h-4 stroke-[2]" />
                          )}
                        </div>

                        {/* Title and Meta Information */}
                        <div className="min-w-0 flex-1">
                          <h3
                            className={`text-xs sm:text-sm font-semibold truncate transition-colors ${
                              isDone
                                ? "text-slate-700 dark:text-slate-300"
                                : isNext
                                ? "text-sky-700 dark:text-sky-300 font-bold"
                                : "text-slate-900 dark:text-white"
                            }`}
                          >
                            {cleanLessonTitle(item.title)}
                          </h3>

                          {/* Desktop description snippet (hidden on mobile) */}
                          {item.description && (
                            <p className="hidden sm:block text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {item.description}
                            </p>
                          )}

                          {/* Concise Meta Line */}
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                            <span>{metaText}</span>

                            {/* Live Relative Time */}
                            {liveInfo && (
                              <>
                                <span className="text-slate-300 dark:text-slate-600">•</span>
                                <span
                                  className={
                                    liveInfo.isLiveNow
                                      ? "font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1"
                                      : "text-indigo-600 dark:text-indigo-400 font-medium"
                                  }
                                >
                                  {liveInfo.isLiveNow && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                  )}
                                  {liveInfo.relativeText}
                                </span>
                              </>
                            )}

                            {/* Overdue Tag */}
                            {isOverdue && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                Overdue
                              </span>
                            )}

                            {/* Locked Tag */}
                            {item.isLocked && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                <Lock className="w-2.5 h-2.5" />
                                <span>
                                  Locked
                                  {item.unlockAt
                                    ? ` · ${new Date(item.unlockAt).toLocaleDateString(
                                        undefined,
                                        { month: "short", day: "numeric" }
                                      )}`
                                    : ""}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Action Buttons and Indicators */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Live Session Actions */}
                        {liveInfo && (
                          <div className="flex items-center gap-1.5">
                            {liveInfo.isLiveNow ? (
                              <a
                                href={liveInfo.meetUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1 shadow-xs animate-pulse"
                              >
                                <Radio className="w-3 h-3" />
                                <span>Join Live</span>
                              </a>
                            ) : liveInfo.hasRecording ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLesson(item);
                                  setCurrentView("player");
                                }}
                                className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 hover:bg-indigo-100 transition-colors"
                              >
                                Watch Recording
                              </button>
                            ) : (
                              <a
                                href={liveInfo.calendarUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title={`Add to Google Calendar (${liveInfo.userTimeZone})`}
                                className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                              >
                                <Calendar className="w-3 h-3" />
                                <span>Calendar</span>
                              </a>
                            )}
                          </div>
                        )}

                        {/* Next Incomplete Highlight Button (Desktop) */}
                        {isNext && !item.isLocked && (
                          <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs">
                            {isInProgress ? "Continue" : "Start"}
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        )}

                        <ChevronRight
                          className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${
                            isNext
                              ? "text-sky-600 dark:text-sky-400"
                              : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200"
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Resource Folders (Collapsible) */}
          {folderLessons.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsResourcesExpanded(!isResourcesExpanded)}
                  className="flex items-center gap-2 group cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-md bg-teal-50 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-800/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                    <FolderOpen className="w-3.5 h-3.5" />
                  </div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                    Resources & Files
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {folderLessons.length}
                  </span>
                  {isResourcesExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 ml-1" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
                  )}
                </button>
              </div>

              {isResourcesExpanded && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {folderLessons.map((item: any) => {
                    const isDone = completedLessonIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSelectedLesson(item);
                          setCurrentView("player");
                        }}
                        className="group bg-white dark:bg-[#0B1120] hover:bg-slate-50/80 dark:hover:bg-[#0E1726] rounded-xl border border-slate-200/90 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700 p-3.5 transition-colors duration-150 shadow-2xs hover:shadow-xs flex items-center justify-between cursor-pointer min-h-[56px]"
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-800/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                            <Folder className="w-4 h-4 stroke-[2]" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs font-semibold text-slate-900 dark:text-white truncate group-hover:text-teal-600 dark:group-hover:text-teal-300">
                              {cleanLessonTitle(item.title)}
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {item.attachments?.length || 0} Files & Notes
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.isLocked && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <Lock className="w-2.5 h-2.5" />
                              <span>Locked</span>
                            </span>
                          )}
                          {isDone && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          )}
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Bottom "Continue" Mobile Bar (Mobile only, < 768px) */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 p-3 shadow-lg">
          {nextIncompleteItem ? (
            <button
              type="button"
              onClick={() => {
                setSelectedLesson(nextIncompleteItem);
                setCurrentView("player");
              }}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <span>
                {checkItemStatus(nextIncompleteItem).isInProgress
                  ? "Continue"
                  : "Start"}{" "}
                Next: {cleanLessonTitle(nextIncompleteItem.title)}
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : nextModule ? (
            <button
              type="button"
              onClick={() => {
                setSelectedModule(nextModule);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <span>Next Week: {formatWeekTitle(nextModule.title, currentModuleIndex + 1)}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="text-center py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>All module activities completed!</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const handleAssessmentCodeSubmit = async (code: string, _testSummary: any) => {
    markLessonComplete(selectedLesson.id);
    try {
      await submitAssessmentTaskApi({
        assignmentId: selectedLesson.id,
        lessonId: selectedLesson.id,
        pathwayId,
        type: "coding_test",
        title: selectedLesson.title,
        codeSnippet: code,
      }).unwrap();
    } catch {
      // Non-critical fallback
    }
  };

  const handleSubjectiveVideoSubmit = async (data: { text?: string; videoUrl?: string }) => {
    markLessonComplete(selectedLesson.id);
    try {
      await submitAssessmentTaskApi({
        assignmentId: selectedLesson.id,
        lessonId: selectedLesson.id,
        pathwayId,
        type: data.videoUrl ? "video_test" : "subjective_test",
        title: selectedLesson.title,
        videoUrl: data.videoUrl,
        submissionText: data.text,
      }).unwrap();
    } catch {
      // Non-critical fallback
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F8FAFC] dark:bg-[#070A11] text-slate-900 dark:text-slate-100 flex flex-col justify-between">
      <div>
        {/* SCHEDULED LOCKED ACTIVITY VIEW */}
        {selectedLesson?.isLocked ? (
          <div className="bg-white dark:bg-[#0B1120] border-b border-slate-200/80 dark:border-sky-500/20 py-16">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center space-y-6">
              <button
                onClick={handleBackToModule}
                aria-label={moduleBackLabel}
                className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white cursor-pointer px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070A11] transition-all min-h-[44px]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{moduleBackLabel}</span>
              </button>

              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500/20 to-orange-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
                <Lock className="w-8 h-8 stroke-[2.2]" />
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                  Scheduled Release Content
                </span>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                  {cleanLessonTitle(selectedLesson.title)}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  This activity has been scheduled by course managers and is locked for learners. It will automatically unlock once the scheduled release time arrives.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070A11] border border-slate-200/80 dark:border-slate-800/80 max-w-md mx-auto space-y-2 text-left">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Curriculum Module:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedModule?.title}</span>
                </div>
                {selectedLesson.unlockAt && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Scheduled Unlock:</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                      {new Date(selectedLesson.unlockAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Status:</span>
                  <span className="font-bold text-amber-500 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>Time Locked</span>
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleBackToModule}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-sky-500/20 cursor-pointer"
                >
                  Explore Other Activities
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* FOLDER & RESOURCES HUB VIEW */}
            {isFolder && (
          <div className="bg-white dark:bg-[#0B1120] border-b border-slate-200/80 dark:border-sky-500/20 py-8">
            <div className="max-w-3xl lg:max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleBackToModule}
                  aria-label={moduleBackLabel}
                  className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white cursor-pointer min-h-[44px]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{moduleBackLabel}</span>
                </button>
                <button
                  onClick={() => markLessonComplete(selectedLesson.id)}
                  className="text-xs font-bold px-3 py-2 min-h-[44px] rounded-xl bg-teal-600 hover:bg-teal-500 text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{completedLessonIds.includes(selectedLesson.id) ? "Completed" : "Mark as Reviewed"}</span>
                </button>
              </div>

              <div className="flex items-start gap-4 p-5 rounded-2xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200/70 dark:border-teal-800/40">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <FolderOpen className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                    {cleanLessonTitle(selectedLesson.title)}
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Resource folder containing starter code, supplementary cheat sheets, and learning materials.
                  </p>
                </div>
              </div>

              {/* Folder Overview Markdown Notes */}
              {selectedLesson.description && (
                <div className="p-5 rounded-2xl bg-slate-50/60 dark:bg-[#070A11] border border-slate-200/80 dark:border-slate-800/80 prose prose-slate dark:prose-invert max-w-none text-xs sm:text-sm">
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(selectedLesson.description) }} />
                </div>
              )}

              {/* Downloadable Attachments Cards */}
              {selectedLesson.attachments && selectedLesson.attachments.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Files & Learning Assets ({selectedLesson.attachments.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedLesson.attachments.map((att: any) => (
                      <a
                        key={att.id}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070A11] hover:border-teal-400 hover:shadow-xs transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                            <FileArchive className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-teal-600">
                              {att.name}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">{att.size || "Downloadable Link"}</p>
                          </div>
                        </div>
                        <Download className="w-4 h-4 text-slate-400 group-hover:text-teal-600 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Nested Lessons inside this Folder */}
              {(() => {
                const childLessons = selectedModule?.items.filter((i: any) => i.folderId === selectedLesson.id) || [];
                if (childLessons.length === 0) return null;
                return (
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      <span>Lessons & Assessments in this Folder ({childLessons.length})</span>
                    </h3>
                    <div className="space-y-2">
                      {childLessons.map((cItem: any) => {
                        const isDone = completedLessonIds.includes(cItem.id);
                        return (
                          <div
                            key={cItem.id}
                            onClick={() => {
                              setSelectedLesson(cItem);
                              setCurrentView("player");
                            }}
                            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070A11] hover:border-teal-400 hover:shadow-xs transition-all flex items-center justify-between cursor-pointer group"
                          >
                            <div className="flex items-center gap-3 min-w-0 pr-2">
                              <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                                {cItem.type === "video" ? (
                                  <PlayCircle className="w-4 h-4 stroke-[2.2]" />
                                ) : cItem.type === "quiz" ? (
                                  <FileQuestion className="w-4 h-4 stroke-[2.2]" />
                                ) : cItem.type === "coding_test" ? (
                                  <Code2 className="w-4 h-4 stroke-[2.2]" />
                                ) : (
                                  <FileText className="w-4 h-4 stroke-[2.2]" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-teal-600 dark:group-hover:text-teal-400 truncate">
                                  {cItem.title}
                                </h4>
                                <span className="text-[10px] text-slate-400">
                                  {cItem.duration || "15 Mins"} · {cItem.category || "Lesson"}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* CODING TEST RUNNER */}
        {isCodingTest && (
          <div className="bg-slate-50/70 dark:bg-[#0B1120] border-b border-slate-200/80 dark:border-sky-500/20 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-4">
              <button
                onClick={handleBackToModule}
                aria-label={moduleBackLabel}
                className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-white cursor-pointer mb-2 transition-colors min-h-[44px]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{moduleBackLabel}</span>
              </button>
              <CodingTestRunner
                title={cleanLessonTitle(selectedLesson.title)}
                description={
                  selectedLesson.description ||
                  selectedLesson.instructions ||
                  "Solve the problem according to specifications and execute code against automated test cases."
                }
                config={(selectedLesson as any).config}
                isCompleted={completedLessonIds.includes(selectedLesson.id)}
                onSubmit={handleAssessmentCodeSubmit}
              />
            </div>
          </div>
        )}

        {/* SUBJECTIVE OR VIDEO TEST RUNNER */}
        {isSubjectiveOrVideoTest && (
          <div className="bg-slate-50/70 dark:bg-[#0B1120] border-b border-slate-200/80 dark:border-sky-500/20 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-4">
              <button
                onClick={handleBackToModule}
                aria-label={moduleBackLabel}
                className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-white cursor-pointer mb-2 transition-colors min-h-[44px]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{moduleBackLabel}</span>
              </button>
              <SubjectiveVideoTestRunner
                type={
                  (selectedLesson as any)?.type === "video_test" ||
                  (selectedLesson as any)?.category === "TEST"
                    ? "VIDEO_TEST"
                    : "SUBJECTIVE_TEST"
                }
                title={cleanLessonTitle(selectedLesson.title)}
                description={
                  selectedLesson.description ||
                  selectedLesson.instructions ||
                  "Provide your architectural rationale or link your video walkthrough viva demonstration."
                }
                config={(selectedLesson as any).config}
                isCompleted={completedLessonIds.includes(selectedLesson.id)}
                onSubmit={handleSubjectiveVideoSubmit}
              />
            </div>
          </div>
        )}

        {/* LIVE CLASS VIEW */}
        {isLive && (
          <div className="bg-white dark:bg-[#0B1120] border-b border-slate-200/80 dark:border-sky-500/20 py-8">
            <div className="max-w-3xl lg:max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleBackToModule}
                  aria-label={moduleBackLabel}
                  className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white cursor-pointer min-h-[44px]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{moduleBackLabel}</span>
                </button>
                <button
                  onClick={() => markLessonComplete(selectedLesson.id)}
                  className="text-xs font-bold px-3 py-2 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{completedLessonIds.includes(selectedLesson.id) ? "Session Completed" : "Mark as Attended"}</span>
                </button>
              </div>

              {/* Live Session Hero Card */}
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-900 via-[#0E1326] to-[#070A11] border border-indigo-500/30 p-6 sm:p-8 text-white space-y-6 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-black uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    Interactive Live Class
                  </div>
                  <div className="text-xs text-indigo-300 font-medium">
                    Unisole Skill AI Labs • Cohort Mentorship
                  </div>
                </div>

                <div className="space-y-2">
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {selectedLesson.title}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                    {selectedLesson.description ||
                      "Join the real-time architectural lab walkthrough, live coding demonstrations, and Q&A with industry lead architects."}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
                    <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">Scheduled Date</span>
                    <span className="text-xs sm:text-sm font-bold text-white mt-0.5 block">
                      {selectedLesson.liveDate || "Weekend Session"}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
                    <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">Time Slot</span>
                    <span className="text-xs sm:text-sm font-bold text-white mt-0.5 block">
                      {selectedLesson.liveTime || "6:00 PM - 8:00 PM IST"}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
                    <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">Lead Instructor</span>
                    <span className="text-xs sm:text-sm font-bold text-white mt-0.5 block">
                      {selectedLesson.mentorName || "Lead AI Systems Architect"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <a
                    href={selectedLesson.liveMeetingUrl || "https://meet.google.com/new"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-xs sm:text-sm py-3 px-6 rounded-2xl shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
                  >
                    <VideoIcon className="w-4 h-4 stroke-[2.5]" />
                    <span>Join Live Classroom</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-75" />
                  </a>
                </div>
              </div>

              {/* Instructions / Agenda Box */}
              {selectedLesson.instructions && (
                <div className="bg-slate-50 dark:bg-[#070A11] rounded-2xl border border-slate-200 dark:border-sky-500/20 p-5 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Live Workshop Agenda & Setup
                  </h3>
                  <div className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                    {selectedLesson.instructions}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIDEO PLAYER VIEW */}
        {isVideo && hasRealVideo && (
          <div className="bg-slate-900 dark:bg-black w-full">
            <div className="max-w-4xl mx-auto sm:px-4 sm:pt-4">
              <div className="relative bg-slate-950 dark:bg-[#0B1120] border border-slate-800 dark:border-sky-500/20 w-full aspect-video sm:max-h-[480px] lg:max-h-[520px] sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                {/* Top Video Header Overlay */}
                <div className="p-3 sm:p-4 flex items-center justify-between text-white bg-black/60 backdrop-blur-xs z-10 shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      onClick={handleBackToModule}
                      aria-label={moduleBackLabel}
                      className="p-1.5 rounded-lg text-white/90 hover:text-white hover:bg-white/20 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
                    </button>
                    <span className="text-xs sm:text-sm font-bold text-white truncate">
                      {cleanLessonTitle(selectedLesson?.title || "")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => markLessonComplete(selectedLesson.id)}
                      className="text-xs font-bold px-3 py-2 min-h-[44px] rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>{completedLessonIds.includes(selectedLesson.id) ? "Completed" : "Mark Complete"}</span>
                    </button>
                    <div className="text-[10px] font-black tracking-wider bg-sky-500/20 text-sky-400 border border-sky-500/40 px-2 py-1 rounded">
                      UNISOLE
                    </div>
                  </div>
                </div>

                {/* Embedded YouTube Player (lazy loading & mobile data preservation) */}
                <div className="flex-1 w-full h-full relative">
                  <iframe
                    src={getEmbedVideoUrl(selectedLesson?.videoUrl)}
                    title={selectedLesson?.title || "Curriculum Video"}
                    className="w-full h-full border-0 absolute inset-0"
                    loading="lazy"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* READING / TEXT / STUDY MATERIAL VIEW */}
        {isReading && (
          <div className="bg-white dark:bg-[#0B1120] border-b border-slate-200/80 dark:border-sky-500/20 py-8">
            <div className="max-w-3xl lg:max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleBackToModule}
                  className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-white cursor-pointer transition-colors min-h-[44px] py-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Curriculum Module</span>
                </button>
                <button
                  onClick={() => markLessonComplete(selectedLesson.id)}
                  className="text-xs font-bold px-3 py-2 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{completedLessonIds.includes(selectedLesson.id) ? "Completed" : "Mark as Read"}</span>
                </button>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 uppercase tracking-wider">
                    Reading & Study Material
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {selectedLesson.duration || "15 Mins"}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {cleanLessonTitle(selectedLesson.title)}
                </h1>
              </div>

              {selectedLesson.description || selectedLesson.instructions ? (
                <div className="p-6 rounded-2xl bg-slate-50/60 dark:bg-[#070A11] border border-slate-200/80 dark:border-slate-800/80 prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdownToHtml(selectedLesson.description || selectedLesson.instructions || ""),
                    }}
                  />
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-slate-50/60 dark:bg-[#070A11] border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                  <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    No video for this lesson
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Review the notes, syllabus, and supplementary materials for this activity.
                  </p>
                </div>
              )}

              {selectedLesson.attachments && selectedLesson.attachments.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Downloadable Resources ({selectedLesson.attachments.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedLesson.attachments.map((att: any) => (
                      <a
                        key={att.id || att.url}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070A11] hover:border-sky-400 hover:shadow-xs transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-sky-600">
                              {att.name || "Attachment"}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">{att.size || "Download"}</p>
                          </div>
                        </div>
                        <Download className="w-4 h-4 text-slate-400 group-hover:text-sky-600 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* INTERACTIVE QUIZ VIEW */}
        {isQuiz && (
          <div className="bg-white dark:bg-[#0B1120] border-b border-slate-200/80 dark:border-sky-500/20 py-8">
            <div className="max-w-3xl lg:max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleBackToModule}
                  aria-label={moduleBackLabel}
                  className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white cursor-pointer min-h-[44px]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{moduleBackLabel}</span>
                </button>
              </div>

              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-zinc-100">
                  {cleanLessonTitle(selectedLesson.title)}
                </h1>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  Answer the multiple-choice questions below to test your understanding of this module.
                </p>
              </div>

              {quizSubmitted && (
                <div className="p-4 rounded-2xl border bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold">
                        Submitted
                      </h4>
                      <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                        Your quiz answers have been recorded and submitted.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setQuizSubmitted(false);
                      setQuizScore(null);
                    }}
                    className="text-xs font-bold text-emerald-700 dark:text-emerald-300 underline hover:text-emerald-900 dark:hover:text-emerald-100 cursor-pointer"
                  >
                    Retake Quiz
                  </button>
                </div>
              )}

              <form onSubmit={handleQuizSubmit} className="space-y-6 pt-2">
                {(selectedLesson.questions || []).map((q, qIdx) => {
                  const userAnswer = quizAnswers[q.id];
                  const isCorrect = userAnswer === q.correctOptionIndex;

                  return (
                    <div
                      key={q.id}
                      className="bg-slate-50 dark:bg-[#0E121B] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-zinc-800 space-y-3"
                    >
                      <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                        {qIdx + 1}. {q.question}
                      </h3>

                      <div className="space-y-2">
                        {q.options.map((opt, optIdx) => {
                          const isSelected = userAnswer === optIdx;
                          return (
                            <label
                              key={optIdx}
                              className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                                isSelected
                                  ? "bg-sky-50 dark:bg-sky-950/50 border-sky-400 text-sky-950 dark:text-sky-200 font-semibold shadow-2xs"
                                  : "bg-white dark:bg-[#121622] border-slate-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-slate-300"
                              }`}
                            >
                              <input
                                type="radio"
                                name={`question-${q.id}`}
                                value={optIdx}
                                checked={isSelected}
                                onChange={() => {
                                  if (!quizSubmitted) {
                                    setQuizAnswers((prev) => ({ ...prev, [q.id]: optIdx }));
                                  }
                                }}
                                disabled={quizSubmitted}
                                className="mt-0.5 accent-sky-600 cursor-pointer"
                              />
                              <span className="flex-1">{opt}</span>
                            </label>
                          );
                        })}
                      </div>

                      {quizSubmitted && (
                        <div
                          className={`p-3 rounded-xl text-xs font-medium ${
                            isCorrect
                              ? "bg-emerald-100/70 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-rose-100/70 text-rose-900 dark:bg-rose-950/60 dark:text-rose-300"
                          }`}
                        >
                          <p className="font-bold">{isCorrect ? "Correct!" : "Incorrect"}</p>
                          <p className="mt-0.5">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}

                {!quizSubmitted && (
                  <button
                    type="submit"
                    className="w-full sm:w-auto bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs py-3 px-8 rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Submit Quiz Answers
                  </button>
                )}
              </form>
            </div>
          </div>
        )}

        {/* INTERACTIVE LAB ASSIGNMENT VIEW */}
        {isAssignment && (
          <div className="bg-white dark:bg-[#0B1120] border-b border-slate-200/80 dark:border-sky-500/20 py-8">
            <div className="max-w-3xl lg:max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleBackToModule}
                  className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-white cursor-pointer transition-colors min-h-[44px] py-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Curriculum Module</span>
                </button>
              </div>

              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  {cleanLessonTitle(selectedLesson.title)}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Submit your repository or project link below for mentor review.
                </p>
              </div>

              {assignmentSubmitted ? (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                    <span>Assignment Submitted!</span>
                  </div>
                  <p className="text-xs opacity-90">
                    Your deliverable has been queued for mentor evaluation. Submission URL:{" "}
                    <a
                      href={assignmentRepoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-mono text-emerald-700 dark:text-emerald-300"
                    >
                      {assignmentRepoUrl}
                    </a>
                  </p>
                </div>
              ) : (
                <form onSubmit={handleAssignmentSubmit} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      GitHub Repository or Project Link *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                        <Github className="w-4 h-4" />
                      </div>
                      <input
                        type="url"
                        required
                        value={assignmentRepoUrl}
                        onChange={(e) => setAssignmentRepoUrl(e.target.value)}
                        placeholder="https://github.com/your-username/repo-name"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-sky-500/30 bg-white dark:bg-[#070A11] text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs py-3 px-8 rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Submit
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
          </>
        )}
      </div>

      {/* Bottom Sticky Lesson Navigation */}
      <div className="sticky bottom-0 z-20 bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-sky-500/20 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
        <div className="max-w-3xl lg:max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <button
            onClick={handlePreviousLesson}
            disabled={!hasPrevious}
            aria-label="Previous lesson"
            className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              hasPrevious
                ? "bg-sky-50 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-500/25 border border-sky-200 dark:border-sky-500/30 shadow-2xs"
                : "bg-slate-100 dark:bg-slate-900 text-slate-300 dark:text-slate-600 border border-slate-200 dark:border-slate-800 cursor-not-allowed"
            }`}
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          <span className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">
            Lesson {currentLessonIndex + 1} of {allLessonItems.length}
          </span>

          <button
            onClick={handleNextLesson}
            disabled={!hasNext}
            aria-label="Next lesson"
            className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              hasNext
                ? "bg-sky-50 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-500/25 border border-sky-200 dark:border-sky-500/30 shadow-2xs"
                : "bg-slate-100 dark:bg-slate-900 text-slate-300 dark:text-slate-600 border border-slate-200 dark:border-slate-800 cursor-not-allowed"
            }`}
          >
            <ArrowRight className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Support Ticket Modal */}
      {supportTicketOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0B1120] text-slate-900 dark:text-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 dark:border-sky-500/30 p-6 space-y-4 ">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-sky-500/20">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Support Ticket</h3>
              <button onClick={() => setSupportTicketOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Our academic mentoring team reviews tickets within 2 business hours.
            </p>
            <textarea
              rows={3}
              placeholder="Describe the issue you're facing..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-sky-500/30 bg-slate-50 dark:bg-[#070A11] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSupportTicketOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert("Support ticket created. Reference #UNS-8921");
                  setSupportTicketOpen(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 cursor-pointer transition-all"
              >
                Submit Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


