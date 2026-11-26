import { useState, useMemo } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Search,
  ArrowLeft,
  Eye,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Download,
  CheckCircle2,
  Clock,
  FileText,
  HelpCircle,
  Users,
} from "lucide-react";
import {
  API_BASE_URL,
  useGetMentorCockpitQuery,
  useGetAdminSubmissionsQuery,
  useGetAdminSubmissionActivitiesQuery,
  useGetAdminActivityDetailQuery,
  useGetAdminActivityNotSubmittedQuery,
  useGradeSubmissionMutation,
} from "../../store/apiSlice";
import MentorCockpitView from "../../components/lms/MentorCockpitView";

interface SubmissionsPageProps {
  initialMode?: "dashboard" | "student";
}

const PENDING_STATUS_SET = new Set(["SUBMITTED", "UNDER_REVIEW", "PENDING"]);
const REVIEWED_STATUS_SET = new Set(["GRADED", "APPROVED", "COMPLETED"]);

function formatActivityType(t?: string) {
  return String(t || "assignment").replace(/_/g, " ");
}

function StatusBadge({ status }: { status?: string }) {
  const s = String(status || "").toUpperCase();
  if (PENDING_STATUS_SET.has(s)) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20">
        <Clock className="w-3 h-3" />
        Pending Review
      </span>
    );
  }
  if (REVIEWED_STATUS_SET.has(s)) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3" />
        {s === "COMPLETED" ? "Completed" : "Reviewed"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-slate-500/20">
      {s || "SUBMITTED"}
    </span>
  );
}

export default function SubmissionsPage({ initialMode }: SubmissionsPageProps = {}) {
  const { user, token } = useSelector((state: any) => state.auth);
  const [searchParams, setSearchParams] = useSearchParams();

  const userRoles: string[] = useMemo(() => {
    const primary = (user?.role || "").toUpperCase();
    const secondary = Array.isArray(user?.roles)
      ? user.roles.map((r: any) => String(r).toUpperCase())
      : Array.isArray(user?.metadata?.roles)
      ? user.metadata.roles.map((r: any) => String(r).toUpperCase())
      : [];
    return [primary, ...secondary];
  }, [user]);

  const isAdmin = userRoles.includes("SUPER_ADMIN") || userRoles.includes("ADMIN");
  const isCourseManager =
    (userRoles.includes("COURSE_MANAGER") || userRoles.includes("PROGRAM_MANAGER")) && !isAdmin;
  const isMentor = userRoles.includes("MENTOR") && !isAdmin && !isCourseManager;
  const canAccess = isAdmin || isCourseManager || isMentor;

  // URL-backed navigation & filters (supports refresh + browser back/forward)
  const rawTab = searchParams.get("tab");
  const activeTab: "assignments" | "quizzes" | "all" =
    rawTab === "quizzes" || rawTab === "all" ? rawTab : "assignments";
  const openActivityId = searchParams.get("activityId") || "";

  // Level 1 filters
  const l1CourseId = searchParams.get("courseId") || "ALL";
  const l1ModuleId = searchParams.get("moduleId") || "ALL";
  const l1Search = searchParams.get("search") || "";
  const l1PendingOnly = searchParams.get("pendingOnly") === "true";
  const l1Sort =
    searchParams.get("sort") || (activeTab === "quizzes" ? "latest_desc" : "pending_desc");
  const l1Page = Math.max(1, Number(searchParams.get("page")) || 1);

  // Level 2 filters
  const detailTab: "submitted" | "not_submitted" =
    searchParams.get("detailTab") === "not_submitted" ? "not_submitted" : "submitted";
  const dStatus = (searchParams.get("status") || "ALL").toUpperCase();
  const dSearch = searchParams.get("dSearch") || "";
  const dSort = searchParams.get("dSort") || "submitted_desc";
  const dPage = Math.max(1, Number(searchParams.get("dPage")) || 1);

  // "All submissions" flat-list local state (unchanged in behavior)
  const [flatFilter, setFlatFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "CHANGES_REQUESTED">("ALL");
  const [flatTypeFilter, setFlatTypeFilter] = useState<string>("ALL");
  const [flatSearch, setFlatSearch] = useState("");
  const [flatPage, setFlatPage] = useState(1);

  // Review / View modal state
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [gradeScore, setGradeScore] = useState<string>("");
  const [gradeFeedback, setGradeFeedback] = useState<string>("");
  const [reviewNotice, setReviewNotice] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);

  const updateParams = (patch: Record<string, string | null>, resetKeys: string[] = []) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const k of resetKeys) next.delete(k);
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "" || v === "ALL" || v === "false") {
          next.delete(k);
        } else {
          next.set(k, v);
        }
      }
      return next;
    });
  };

  // Mentor view (/admin/mentor-view)
  const { data: mentorCockpitData, refetch: refetchCockpit } = useGetMentorCockpitQuery(
    undefined,
    { skip: initialMode !== "student" }
  );

  // Level 1 grouped activities query
  const {
    data: activitiesData,
    isLoading: isLoadingActivities,
    isError: isErrorActivities,
    refetch: refetchActivities,
  } = useGetAdminSubmissionActivitiesQuery(
    {
      tab: activeTab === "quizzes" ? "quizzes" : "assignments",
      courseId: l1CourseId !== "ALL" ? l1CourseId : undefined,
      moduleId: l1ModuleId !== "ALL" ? l1ModuleId : undefined,
      search: l1Search || undefined,
      pendingOnly: activeTab === "assignments" && l1PendingOnly ? "true" : undefined,
      sort: l1Sort,
      page: l1Page,
      limit: 20,
    },
    { skip: Boolean(initialMode) || activeTab === "all" || Boolean(openActivityId) }
  );

  // Level 2 activity detail query
  const {
    data: detailData,
    isLoading: isLoadingDetail,
    isError: isErrorDetail,
    refetch: refetchDetail,
  } = useGetAdminActivityDetailQuery(
    {
      activityId: openActivityId,
      status: dStatus !== "ALL" ? dStatus : undefined,
      search: dSearch || undefined,
      sort: dSort,
      page: dPage,
      limit: 20,
    },
    { skip: Boolean(initialMode) || !openActivityId }
  );

  // Level 2 "Not submitted yet" query
  const {
    data: notSubmittedData,
    isLoading: isLoadingNotSubmitted,
    isError: isErrorNotSubmitted,
  } = useGetAdminActivityNotSubmittedQuery(
    {
      activityId: openActivityId,
      search: dSearch || undefined,
      page: dPage,
      limit: 20,
    },
    { skip: Boolean(initialMode) || !openActivityId || detailTab !== "not_submitted" }
  );

  // Existing flat list query ("All submissions" tab)
  const {
    data: adminSubsData,
    isLoading: isLoadingAdminSubs,
    refetch: refetchAdminSubs,
  } = useGetAdminSubmissionsQuery(
    {
      type: flatTypeFilter !== "ALL" ? flatTypeFilter : undefined,
      status: flatFilter !== "ALL" ? flatFilter : undefined,
      search: flatSearch ? flatSearch : undefined,
      page: flatPage,
      limit: 20,
    },
    { skip: Boolean(initialMode) || activeTab !== "all" }
  );

  const [gradeSubmissionApi, { isLoading: isGrading }] = useGradeSubmissionMutation();

  const openModalForSubmission = (sub: any) => {
    setReviewNotice("");
    setSelectedSubmission(sub);
    setGradeScore(sub.score !== null && sub.score !== undefined ? String(sub.score) : "");
    setGradeFeedback(sub.mentorFeedback || "");
  };

  const handleGradeSubmission = async (
    _menteeId: string,
    submissionId: string,
    score: number,
    feedback: string
  ) => {
    await gradeSubmissionApi({
      id: submissionId,
      body: { score, mentorFeedback: feedback, status: "GRADED" },
    }).unwrap();
    if (initialMode === "student") refetchCockpit();
    if (activeTab === "all") refetchAdminSubs();
    if (!openActivityId && activeTab !== "all") refetchActivities();
    if (openActivityId) {
      const res = await refetchDetail();
      return res?.data || null;
    }
    return null;
  };

  const detailItems: any[] = detailData?.items || [];
  const pendingIds: string[] = useMemo(
    () => detailData?.pendingSubmissionIds || [],
    [detailData?.pendingSubmissionIds]
  );
  const currentModalIndex = selectedSubmission
    ? detailItems.findIndex((item) => item.id === selectedSubmission.id)
    : -1;

  const availableModules = useMemo(() => {
    const mods: any[] = activitiesData?.filters?.modules || [];
    if (l1CourseId === "ALL") return mods;
    return mods.filter((m) => !m.courseId || m.courseId === l1CourseId);
  }, [activitiesData, l1CourseId]);

  const nextPendingId = useMemo(() => {
    if (!selectedSubmission || pendingIds.length === 0) return null;
    const idx = pendingIds.indexOf(selectedSubmission.id);
    if (idx === -1) return pendingIds[0] || null;
    return pendingIds[idx + 1] || pendingIds.find((id) => id !== selectedSubmission.id) || null;
  }, [selectedSubmission, pendingIds]);

  const jumpToSubmissionId = (targetId: string) => {
    const found = detailItems.find((item) => item.id === targetId);
    if (found) {
      openModalForSubmission(found);
      return true;
    }
    return false;
  };

  const handleExportCsv = async () => {
    if (!openActivityId) return;
    setIsExporting(true);
    try {
      const qs = new URLSearchParams();
      if (dStatus !== "ALL") qs.set("status", dStatus);
      if (dSearch) qs.set("search", dSearch);
      if (dSort) qs.set("sort", dSort);
      const url = `${API_BASE_URL}/api/admin/submissions/activities/${encodeURIComponent(
        openActivityId
      )}/export?${qs.toString()}`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      const disp = res.headers.get("Content-Disposition") || "";
      const match = disp.match(/filename="([^"]+)"/);
      a.download = match ? match[1] : "activity-submissions.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    } finally {
      setIsExporting(false);
    }
  };

  if (!canAccess) {
    return <Navigate to="/admin/courses" replace />;
  }

  if (initialMode === "student") {
    return (
      <div className="p-5 sm:p-7 lg:p-8 space-y-6 max-w-[1560px] mx-auto font-sans">
        <MentorCockpitView
          mentor={mentorCockpitData?.mentor}
          mentees={mentorCockpitData?.mentees || []}
          milestones={
            mentorCockpitData?.milestones || {
              submitted: 0,
              evaluated: 0,
              pendingReview: 0,
              atRisk: 0,
            }
          }
          selectedMenteeId={null}
          initialViewMode={initialMode}
          onGradeSubmission={handleGradeSubmission}
        />
      </div>
    );
  }

  const activityMeta = detailData?.activity;
  const isQuizActivity = activityMeta?.tab === "quizzes";

  return (
    <div className="p-5 sm:p-7 lg:p-8 space-y-6 max-w-[1560px] mx-auto font-sans">
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Submissions
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Review student deliverables, quiz results, and pending evaluations by activity
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-[#0B1120] p-1 rounded-xl border border-slate-200/80 dark:border-slate-800/80 self-start md:self-auto">
          <button
            type="button"
            onClick={() =>
              updateParams(
                { tab: "assignments" },
                ["activityId", "detailTab", "status", "dSearch", "dSort", "dPage", "page", "pendingOnly"]
              )
            }
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "assignments"
                ? "bg-white dark:bg-sky-500/20 text-sky-600 dark:text-sky-300 font-bold shadow-2xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            Assignments
          </button>
          <button
            type="button"
            onClick={() =>
              updateParams(
                { tab: "quizzes" },
                ["activityId", "detailTab", "status", "dSearch", "dSort", "dPage", "page", "pendingOnly"]
              )
            }
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "quizzes"
                ? "bg-white dark:bg-sky-500/20 text-sky-600 dark:text-sky-300 font-bold shadow-2xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            Quizzes / MCQs
          </button>
          <button
            type="button"
            onClick={() =>
              updateParams(
                { tab: "all" },
                ["activityId", "detailTab", "status", "dSearch", "dSort", "dPage", "page", "pendingOnly"]
              )
            }
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-white dark:bg-sky-500/20 text-sky-600 dark:text-sky-300 font-bold shadow-2xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            All submissions
          </button>
        </div>
      </div>

      {/* TAB: ALL SUBMISSIONS (Existing flat list, unchanged) */}
      {activeTab === "all" ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search student, activity, or course..."
                value={flatSearch}
                onChange={(e) => {
                  setFlatSearch(e.target.value);
                  setFlatPage(1);
                }}
                className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={flatTypeFilter}
                onChange={(e) => {
                  setFlatTypeFilter(e.target.value);
                  setFlatPage(1);
                }}
                className="px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="ALL">All Types</option>
                <option value="quiz">MCQ Quiz</option>
                <option value="subjective_test">Subjective Test</option>
                <option value="coding_test">Coding / Lab</option>
                <option value="assignment">Assignment</option>
                <option value="video_test">Video Test</option>
              </select>

              <select
                value={flatFilter}
                onChange={(e) => {
                  setFlatFilter(e.target.value as any);
                  setFlatPage(1);
                }}
                className="px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending Review</option>
                <option value="APPROVED">Graded / Completed</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0B1120] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50 dark:bg-[#070A11]/60">
                    <th className="p-4">Student</th>
                    <th className="p-4">Activity</th>
                    <th className="p-4">Course</th>
                    <th className="p-4">Submitted</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Score</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {isLoadingAdminSubs ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-400">
                        Loading student submissions...
                      </td>
                    </tr>
                  ) : (adminSubsData?.items || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-400">
                        No submissions found.
                      </td>
                    </tr>
                  ) : (
                    (adminSubsData?.items || []).map((sub: any) => (
                      <tr
                        key={sub.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="p-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {sub.studentName || "Student"}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {sub.studentEmail || sub.studentPhone}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-100">
                            {sub.lessonTitle || sub.lessonId}
                          </div>
                          <span className="inline-block mt-0.5 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300">
                            {formatActivityType(sub.type)}
                          </span>
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-300">{sub.courseTitle}</td>
                        <td className="p-4 text-[11px] text-slate-400 font-mono">
                          {sub.createdAt ? new Date(sub.createdAt).toLocaleString() : "—"}
                        </td>
                        <td className="p-4">
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-300">
                            {sub.status}
                          </span>
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-200">
                          {sub.score !== null && sub.score !== undefined
                            ? `${sub.score}/${sub.maxScore || 100}`
                            : "—"}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            type="button"
                            onClick={() => openModalForSubmission(sub)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-500/20 text-slate-800 dark:text-white hover:text-sky-600 dark:hover:text-sky-300 rounded-xl cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {adminSubsData && adminSubsData.total > adminSubsData.limit && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500">
                <span>
                  Page {flatPage} of {Math.ceil(adminSubsData.total / adminSubsData.limit)} (
                  {adminSubsData.total} total)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={flatPage <= 1}
                    onClick={() => setFlatPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={flatPage * adminSubsData.limit >= adminSubsData.total}
                    onClick={() => setFlatPage((p) => p + 1)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : openActivityId ? (
        /* LEVEL 2: ACTIVITY DETAIL */
        <div className="space-y-4">
          {/* Header */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0B1120] p-4 sm:p-5 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() =>
                    updateParams(
                      { activityId: null },
                      ["detailTab", "status", "dSearch", "dSort", "dPage"]
                    )
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to {activeTab === "quizzes" ? "Quizzes / MCQs" : "Assignments"}
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {activityMeta?.title || "Loading activity..."}
                  </h2>
                  {activityMeta?.type && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300">
                      {formatActivityType(activityMeta.type)}
                    </span>
                  )}
                </div>
                {activityMeta && (
                  <p className="text-xs text-slate-400">
                    {activityMeta.courseTitle} · {activityMeta.moduleTitle}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {activityMeta && (
                  <>
                    <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#070A11] border border-slate-200/80 dark:border-slate-800/80 text-xs">
                      <span className="text-slate-400 mr-1.5">Submitted:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {activityMeta.submittedCount}
                      </span>
                    </div>
                    {isQuizActivity ? (
                      <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#070A11] border border-slate-200/80 dark:border-slate-800/80 text-xs">
                        <span className="text-slate-400 mr-1.5">Avg Score:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {activityMeta.avgScore !== null && activityMeta.avgScore !== undefined
                            ? `${activityMeta.avgScore}%`
                            : "—"}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                          <span className="text-amber-600 dark:text-amber-400 mr-1.5">Pending:</span>
                          <span className="font-bold text-amber-700 dark:text-amber-300">
                            {activityMeta.pendingCount}
                          </span>
                        </div>
                        <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                          <span className="text-emerald-600 dark:text-emerald-400 mr-1.5">
                            Reviewed:
                          </span>
                          <span className="font-bold text-emerald-700 dark:text-emerald-300">
                            {activityMeta.reviewedCount}
                          </span>
                        </div>
                      </>
                    )}
                  </>
                )}

                <button
                  type="button"
                  disabled={isExporting || !activityMeta}
                  onClick={handleExportCsv}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 dark:bg-sky-500 text-white dark:text-slate-950 hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isExporting ? "Exporting..." : "Export CSV"}
                </button>
              </div>
            </div>

            {reviewNotice && (
              <div className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
                <span>{reviewNotice}</span>
                <button
                  type="button"
                  onClick={() => setReviewNotice("")}
                  className="p-0.5 hover:opacity-75 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Sub-tabs: Submitted vs Not submitted yet */}
            <div className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-3">
              <button
                type="button"
                onClick={() => updateParams({ detailTab: "submitted", dPage: null })}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                  detailTab === "submitted"
                    ? "bg-sky-500/10 text-sky-600 dark:text-sky-300"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Submitted ({activityMeta?.submittedCount ?? 0})
              </button>
              <button
                type="button"
                onClick={() => updateParams({ detailTab: "not_submitted", dPage: null })}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                  detailTab === "not_submitted"
                    ? "bg-sky-500/10 text-sky-600 dark:text-sky-300"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Not submitted yet
              </button>
            </div>
          </div>

          {detailTab === "submitted" ? (
            <>
              {/* Detail Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search student name or email..."
                    value={dSearch}
                    onChange={(e) => updateParams({ dSearch: e.target.value, dPage: null })}
                    className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!isQuizActivity && (
                    <select
                      aria-label="Filter by status"
                      value={dStatus}
                      onChange={(e) => updateParams({ status: e.target.value, dPage: null })}
                      className="px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 text-slate-700 dark:text-slate-200 focus:outline-none"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="PENDING">Pending Review</option>
                      <option value="REVIEWED">Reviewed</option>
                    </select>
                  )}

                  <select
                    aria-label="Sort submissions"
                    value={dSort}
                    onChange={(e) => updateParams({ dSort: e.target.value, dPage: null })}
                    className="px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 text-slate-700 dark:text-slate-200 focus:outline-none"
                  >
                    <option value="submitted_desc">Newest Submitted</option>
                    <option value="submitted_asc">Oldest Submitted</option>
                    <option value="name_asc">Student Name (A–Z)</option>
                    <option value="name_desc">Student Name (Z–A)</option>
                  </select>
                </div>
              </div>

              {/* Detail Table */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0B1120] overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50 dark:bg-[#070A11]/60">
                        <th className="p-4">Student</th>
                        <th className="p-4">Submitted Time</th>
                        <th className="p-4">Status</th>
                        {isQuizActivity && <th className="p-4">Attempts</th>}
                        <th className="p-4">Score / Grade</th>
                        <th className="p-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                      {isLoadingDetail ? (
                        <tr>
                          <td colSpan={isQuizActivity ? 6 : 5} className="p-10 text-center text-slate-400">
                            Loading submissions...
                          </td>
                        </tr>
                      ) : isErrorDetail ? (
                        <tr>
                          <td colSpan={isQuizActivity ? 6 : 5} className="p-10 text-center text-rose-500">
                            Failed to load activity submissions.
                          </td>
                        </tr>
                      ) : detailItems.length === 0 ? (
                        <tr>
                          <td colSpan={isQuizActivity ? 6 : 5} className="p-10 text-center text-slate-400">
                            No submissions yet for this activity matching your filters.
                          </td>
                        </tr>
                      ) : (
                        detailItems.map((sub: any) => (
                          <tr
                            key={sub.id}
                            className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                          >
                            <td className="p-4">
                              <div className="font-bold text-slate-900 dark:text-white">
                                {sub.studentName || "Deleted Student"}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                {sub.studentEmail || sub.studentPhone || "—"}
                              </div>
                            </td>
                            <td className="p-4 text-[11px] text-slate-400 font-mono">
                              {sub.createdAt ? new Date(sub.createdAt).toLocaleString() : "—"}
                            </td>
                            <td className="p-4">
                              <StatusBadge status={sub.status} />
                            </td>
                            {isQuizActivity && (
                              <td className="p-4 font-mono text-slate-600 dark:text-slate-300">
                                {sub.attemptCount || 1}
                              </td>
                            )}
                            <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-200">
                              {sub.score !== null && sub.score !== undefined
                                ? `${sub.score}/${sub.maxScore || 100}`
                                : "—"}
                            </td>
                            <td className="p-4 text-right">
                              <button
                                type="button"
                                onClick={() => openModalForSubmission(sub)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-500/20 text-slate-800 dark:text-white hover:text-sky-600 dark:hover:text-sky-300 rounded-xl cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                {isQuizActivity ? "View" : "Review"}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {detailData && detailData.total > detailData.limit && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500">
                    <span>
                      Page {dPage} of {Math.ceil(detailData.total / detailData.limit)} (
                      {detailData.total} total)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={dPage <= 1}
                        onClick={() => updateParams({ dPage: String(Math.max(1, dPage - 1)) })}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={dPage * detailData.limit >= detailData.total}
                        onClick={() => updateParams({ dPage: String(dPage + 1) })}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* NOT SUBMITTED YET */
            <div className="space-y-4">
              <div className="relative max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search enrolled student..."
                  value={dSearch}
                  onChange={(e) => updateParams({ dSearch: e.target.value, dPage: null })}
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
              </div>

              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0B1120] overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50 dark:bg-[#070A11]/60">
                        <th className="p-4">Student Name</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Enrolled At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                      {isLoadingNotSubmitted ? (
                        <tr>
                          <td colSpan={3} className="p-10 text-center text-slate-400">
                            Loading enrolled students...
                          </td>
                        </tr>
                      ) : isErrorNotSubmitted ? (
                        <tr>
                          <td colSpan={3} className="p-10 text-center text-rose-500">
                            Failed to load enrolled students.
                          </td>
                        </tr>
                      ) : (notSubmittedData?.items || []).length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-10 text-center text-slate-400">
                            {notSubmittedData?.orphaned
                              ? "This activity is not linked to a course, so enrolled students cannot be listed."
                              : "All enrolled students have submitted this activity."}
                          </td>
                        </tr>
                      ) : (
                        (notSubmittedData?.items || []).map((st: any) => (
                          <tr key={st.studentId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                            <td className="p-4 font-bold text-slate-900 dark:text-white">
                              {st.studentName || "Student"}
                            </td>
                            <td className="p-4 font-mono text-slate-500 dark:text-slate-300">
                              {st.studentEmail || "—"}
                            </td>
                            <td className="p-4 text-[11px] font-mono text-slate-400">
                              {st.enrolledAt ? new Date(st.enrolledAt).toLocaleDateString() : "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {notSubmittedData && notSubmittedData.total > notSubmittedData.limit && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500">
                    <span>
                      Page {dPage} of {Math.ceil(notSubmittedData.total / notSubmittedData.limit)} (
                      {notSubmittedData.total} total)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={dPage <= 1}
                        onClick={() => updateParams({ dPage: String(Math.max(1, dPage - 1)) })}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={dPage * notSubmittedData.limit >= notSubmittedData.total}
                        onClick={() => updateParams({ dPage: String(dPage + 1) })}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* LEVEL 1: ACTIVITY LIST (Assignments / Quizzes) */
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by activity name..."
                value={l1Search}
                onChange={(e) => updateParams({ search: e.target.value, page: null })}
                className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Filter by course"
                value={l1CourseId}
                onChange={(e) =>
                  updateParams({ courseId: e.target.value, moduleId: null, page: null })
                }
                className="px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="ALL">All Courses</option>
                {(activitiesData?.filters?.courses || []).map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by module"
                value={l1ModuleId}
                onChange={(e) => updateParams({ moduleId: e.target.value, page: null })}
                className="px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="ALL">All Modules</option>
                {availableModules.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>

              {activeTab === "assignments" && (
                <label className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 text-slate-700 dark:text-slate-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={l1PendingOnly}
                    onChange={(e) =>
                      updateParams({ pendingOnly: e.target.checked ? "true" : null, page: null })
                    }
                    className="rounded border-slate-300 text-sky-500 focus:ring-sky-500"
                  />
                  Pending review only
                </label>
              )}

              <select
                aria-label="Sort activities"
                value={l1Sort}
                onChange={(e) => updateParams({ sort: e.target.value, page: null })}
                className="px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                {activeTab === "assignments" && (
                  <option value="pending_desc">Most pending first</option>
                )}
                <option value="latest_desc">Latest submission</option>
                <option value="submitted_desc">Most submitted</option>
                <option value="title_asc">Name (A–Z)</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0B1120] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50 dark:bg-[#070A11]/60">
                    <th className="p-4">Activity</th>
                    <th className="p-4">Course & Module</th>
                    <th className="p-4">Submitted</th>
                    {activeTab === "quizzes" ? (
                      <th className="p-4">Average Score</th>
                    ) : (
                      <>
                        <th className="p-4">Pending Review</th>
                        <th className="p-4">Reviewed</th>
                      </>
                    )}
                    <th className="p-4">Latest Submission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {isLoadingActivities ? (
                    <tr>
                      <td colSpan={activeTab === "quizzes" ? 5 : 6} className="p-10 text-center text-slate-400">
                        Loading activities...
                      </td>
                    </tr>
                  ) : isErrorActivities ? (
                    <tr>
                      <td colSpan={activeTab === "quizzes" ? 5 : 6} className="p-10 text-center text-rose-500">
                        Failed to load activities. Please try again.
                      </td>
                    </tr>
                  ) : (activitiesData?.items || []).length === 0 ? (
                    <tr>
                      <td colSpan={activeTab === "quizzes" ? 5 : 6} className="p-10 text-center text-slate-400">
                        {l1Search || l1CourseId !== "ALL" || l1ModuleId !== "ALL" || l1PendingOnly
                          ? "No activities match your current filters."
                          : activeTab === "quizzes"
                          ? "No quizzes or MCQs found."
                          : "No assignments found."}
                      </td>
                    </tr>
                  ) : (
                    (activitiesData?.items || []).map((act: any) => (
                      <tr
                        key={act.activityId}
                        onClick={() =>
                          updateParams(
                            { activityId: act.activityId },
                            ["detailTab", "status", "dSearch", "dSort", "dPage"]
                          )
                        }
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {activeTab === "quizzes" ? (
                              <HelpCircle className="w-4 h-4 text-indigo-500 shrink-0" />
                            ) : (
                              <FileText className="w-4 h-4 text-sky-500 shrink-0" />
                            )}
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">
                                {act.title}
                              </div>
                              <span className="inline-block mt-0.5 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300">
                                {formatActivityType(act.type)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-slate-700 dark:text-slate-200">
                            {act.courseTitle}
                          </div>
                          <div className="text-[11px] text-slate-400">{act.moduleTitle}</div>
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-800 dark:text-slate-100">
                          {act.submittedCount}
                        </td>
                        {activeTab === "quizzes" ? (
                          <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-200">
                            {act.avgScore !== null && act.avgScore !== undefined
                              ? `${act.avgScore}%`
                              : "—"}
                          </td>
                        ) : (
                          <>
                            <td className="p-4">
                              <span
                                className={`inline-block font-mono text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                  act.pendingCount > 0
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-300"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                }`}
                              >
                                {act.pendingCount}
                              </span>
                            </td>
                            <td className="p-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {act.reviewedCount}
                            </td>
                          </>
                        )}
                        <td className="p-4 text-[11px] text-slate-400 font-mono">
                          {act.latestSubmittedAt
                            ? new Date(act.latestSubmittedAt).toLocaleString()
                            : "No submissions yet"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {activitiesData && activitiesData.total > activitiesData.limit && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500">
                <span>
                  Page {l1Page} of {Math.ceil(activitiesData.total / activitiesData.limit)} (
                  {activitiesData.total} activities)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={l1Page <= 1}
                    onClick={() => updateParams({ page: String(Math.max(1, l1Page - 1)) })}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={l1Page * activitiesData.limit >= activitiesData.total}
                    onClick={() => updateParams({ page: String(l1Page + 1) })}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submission Review / Quiz View Modal (reused for Level 2 + All submissions) */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[88vh] overflow-y-auto shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {selectedSubmission.lessonTitle || selectedSubmission.lessonId}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedSubmission.studentName || "Deleted Student"} ·{" "}
                  {formatActivityType(selectedSubmission.type)} ·{" "}
                  {selectedSubmission.createdAt
                    ? new Date(selectedSubmission.createdAt).toLocaleString()
                    : ""}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setSelectedSubmission(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {openActivityId && detailItems.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 py-2 px-3 rounded-xl bg-slate-50 dark:bg-[#070A11] border border-slate-200/80 dark:border-slate-800/80 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentModalIndex <= 0}
                    onClick={() => {
                      if (currentModalIndex > 0) {
                        openModalForSubmission(detailItems[currentModalIndex - 1]);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    Previous student
                  </button>
                  <button
                    type="button"
                    disabled={currentModalIndex < 0 || currentModalIndex >= detailItems.length - 1}
                    onClick={() => {
                      if (currentModalIndex >= 0 && currentModalIndex < detailItems.length - 1) {
                        openModalForSubmission(detailItems[currentModalIndex + 1]);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    Next student
                  </button>
                </div>

                {!isQuizActivity && (
                  <button
                    type="button"
                    disabled={!nextPendingId}
                    onClick={() => {
                      if (nextPendingId) {
                        jumpToSubmissionId(nextPendingId);
                      }
                    }}
                    className="px-3 py-1 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold disabled:opacity-40 cursor-pointer"
                  >
                    Next pending
                  </button>
                )}
              </div>
            )}

            {selectedSubmission.submissionUrl && (
              <a
                href={selectedSubmission.submissionUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-500 hover:underline break-all"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                {selectedSubmission.submissionUrl}
              </a>
            )}

            {selectedSubmission.videoUrl && (
              <a
                href={selectedSubmission.videoUrl}
                target="_blank"
                rel="noreferrer"
                className="block text-xs font-semibold text-sky-500 hover:underline break-all"
              >
                Video Submission: {selectedSubmission.videoUrl}
              </a>
            )}

            {selectedSubmission.submissionText && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070A11] border border-slate-200 dark:border-slate-800 text-xs whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                {selectedSubmission.submissionText}
              </div>
            )}

            {selectedSubmission.codeSnippet && (
              <pre className="p-3.5 rounded-xl bg-slate-950 text-slate-100 text-xs font-mono overflow-x-auto">
                {selectedSubmission.codeSnippet}
              </pre>
            )}

            {/* Read-only summary for Quiz/MCQ; manual grading for assignments */}
            {["quiz", "mcq"].includes(String(selectedSubmission.type || "").toLowerCase()) ? (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <span>
                    Score:{" "}
                    <strong className="font-mono text-slate-900 dark:text-white">
                      {selectedSubmission.score !== null && selectedSubmission.score !== undefined
                        ? `${selectedSubmission.score}/${selectedSubmission.maxScore || 100}`
                        : "—"}
                    </strong>
                  </span>
                  {selectedSubmission.attemptCount && (
                    <span>
                      Attempts:{" "}
                      <strong className="font-mono text-slate-900 dark:text-white">
                        {selectedSubmission.attemptCount}
                      </strong>
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSubmission(null)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Score (/{selectedSubmission.maxScore || 100})
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={selectedSubmission.maxScore || 100}
                      value={gradeScore}
                      onChange={(e) => setGradeScore(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070A11] font-mono"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Feedback
                    </label>
                    <input
                      type="text"
                      value={gradeFeedback}
                      onChange={(e) => setGradeFeedback(e.target.value)}
                      placeholder="Optional review feedback..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070A11]"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSubmission(null)}
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    disabled={isGrading || gradeScore === ""}
                    onClick={async () => {
                      const currentId = selectedSubmission.id;
                      const freshDetail = await handleGradeSubmission(
                        selectedSubmission.studentId,
                        currentId,
                        Number(gradeScore),
                        gradeFeedback
                      );
                      if (openActivityId) {
                        const freshPending: string[] =
                          freshDetail?.pendingSubmissionIds ||
                          pendingIds.filter((id) => id !== currentId);
                        const freshItems: any[] = freshDetail?.items || detailItems;
                        const nextId = freshPending.find((id) => id !== currentId) || freshPending[0];
                        if (nextId) {
                          const nextItem = freshItems.find((item) => item.id === nextId);
                          if (nextItem) {
                            openModalForSubmission(nextItem);
                            return;
                          }
                        }
                        setReviewNotice("All pending submissions for this activity have been reviewed.");
                      }
                      setSelectedSubmission(null);
                    }}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 disabled:opacity-50 cursor-pointer"
                  >
                    {isGrading ? "Saving..." : "Save Grade"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
