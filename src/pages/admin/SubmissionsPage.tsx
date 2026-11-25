import React, { useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Search,
  User,
  ArrowRight,
  Eye,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  useGetMentorCockpitQuery,
  useGetSubmissionsAuditQuery,
  useGetAdminSubmissionsQuery,
  useGetAdminMentorsQuery,
  useGradeSubmissionMutation,
} from "../../store/apiSlice";
import MentorCockpitView from "../../components/lms/MentorCockpitView";

interface SubmissionsPageProps {
  initialMode?: "dashboard" | "student";
}

export default function SubmissionsPage({ initialMode }: SubmissionsPageProps = {}) {
  const { user } = useSelector((state: any) => state.auth);

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

  if (!canAccess) {
    return <Navigate to="/admin/courses" replace />;
  }

  const [activeTab, setActiveTab] = useState<"all" | "cockpit" | "table">(
    !initialMode && (isAdmin || isCourseManager) ? "all" : "cockpit"
  );
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "CHANGES_REQUESTED">("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [gradeScore, setGradeScore] = useState<string>("");
  const [gradeFeedback, setGradeFeedback] = useState<string>("");
  const [selectedMentorId, setSelectedMentorId] = useState<string>("ALL");

  // Fetch live mentors from DB (for Course Manager & Admin)
  const { data: mentors = [] } = useGetAdminMentorsQuery(undefined, {
    skip: isMentor,
  });

  // Queries
  const { data: mentorCockpitData, refetch: refetchCockpit } = useGetMentorCockpitQuery(
    selectedMentorId !== "ALL" ? { mentorId: selectedMentorId } : undefined
  );

  const {
    data: submissionsAudit = [],
    isLoading: isLoadingSubmissions,
    refetch: refetchSubmissions,
  } = useGetSubmissionsAuditQuery({
    status: filter !== "ALL" ? filter : undefined,
    mentorId: selectedMentorId !== "ALL" ? selectedMentorId : undefined,
    search: search ? search : undefined,
  });

  const {
    data: adminSubsData,
    isLoading: isLoadingAdminSubs,
    refetch: refetchAdminSubs,
  } = useGetAdminSubmissionsQuery(
    {
      type: typeFilter !== "ALL" ? typeFilter : undefined,
      status: filter !== "ALL" ? filter : undefined,
      search: search ? search : undefined,
      page,
      limit: 20,
    },
    { skip: activeTab !== "all" }
  );

  const [gradeSubmissionApi, { isLoading: isGrading }] = useGradeSubmissionMutation();

  const handleGradeSubmission = async (
    menteeId: string,
    submissionId: string,
    score: number,
    feedback: string
  ) => {
    try {
      await gradeSubmissionApi({
        id: submissionId,
        body: { score, mentorFeedback: feedback, status: "GRADED" },
      }).unwrap();
      refetchCockpit();
      refetchSubmissions();
      refetchAdminSubs();
    } catch {
      // Non-critical fallback
    }
  };

  const [selectedMenteeId, setSelectedMenteeId] = useState<string | null>(null);

  return (
    <div className="p-5 sm:p-7 lg:p-8 space-y-6 max-w-[1560px] mx-auto font-sans">
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Mentor Cockpit
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Cohort progress, active deliverables, and evaluations
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Mentor Selector for Course Manager & Admin */}
          {(isCourseManager || isAdmin) && (
            <div className="flex items-center gap-2 bg-white dark:bg-[#0B1120] px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 text-xs shadow-2xs">
              <User className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <select
                value={selectedMentorId}
                onChange={(e) => setSelectedMentorId(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="ALL">
                  All Mentors ({mentorCockpitData?.mentees?.length || 0} Mentees)
                </option>
                {mentors.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.activeMenteesCount || 0} Mentees)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tab Switcher */}
          <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-[#0B1120] p-1 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-white dark:bg-sky-500/20 text-sky-600 dark:text-sky-300 font-bold shadow-2xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              All Submissions ({adminSubsData?.total ?? "—"})
            </button>
            <button
              onClick={() => setActiveTab("cockpit")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === "cockpit"
                  ? "bg-white dark:bg-sky-500/20 text-sky-600 dark:text-sky-300 font-bold shadow-2xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("table")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === "table"
                  ? "bg-white dark:bg-sky-500/20 text-sky-600 dark:text-sky-300 font-bold shadow-2xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              By Student ({submissionsAudit.length})
            </button>
          </div>
        </div>
      </div>

      {activeTab === "all" ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search student, activity, or course..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
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
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value as any);
                  setPage(1);
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
                      <tr key={sub.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-slate-900 dark:text-white">{sub.studentName || "Student"}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{sub.studentEmail || sub.studentPhone}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-100">{sub.lessonTitle || sub.lessonId}</div>
                          <span className="inline-block mt-0.5 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300">
                            {String(sub.type || "assignment").replace(/_/g, " ")}
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
                          {sub.score !== null && sub.score !== undefined ? `${sub.score}/${sub.maxScore || 100}` : "—"}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSubmission(sub);
                              setGradeScore(sub.score !== null && sub.score !== undefined ? String(sub.score) : "");
                              setGradeFeedback(sub.mentorFeedback || "");
                            }}
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
                  Page {page} of {Math.ceil(adminSubsData.total / adminSubsData.limit)} ({adminSubsData.total} total)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={page * adminSubsData.limit >= adminSubsData.total}
                    onClick={() => setPage((p) => p + 1)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {selectedSubmission && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {selectedSubmission.lessonTitle || selectedSubmission.lessonId}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {selectedSubmission.studentName} · {String(selectedSubmission.type || "").replace(/_/g, " ")} ·{" "}
                      {selectedSubmission.createdAt ? new Date(selectedSubmission.createdAt).toLocaleString() : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedSubmission(null)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

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
                        await handleGradeSubmission(
                          selectedSubmission.studentId,
                          selectedSubmission.id,
                          Number(gradeScore),
                          gradeFeedback
                        );
                        setSelectedSubmission(null);
                      }}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 disabled:opacity-50 cursor-pointer"
                    >
                      {isGrading ? "Saving..." : "Save Grade"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === "cockpit" ? (
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
          selectedMenteeId={selectedMenteeId}
          initialViewMode={initialMode}
          onGradeSubmission={handleGradeSubmission}
        />
      ) : (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by student, email, or mentor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-[#0B1120] p-1 rounded-xl border border-slate-200/80 dark:border-slate-800/80 self-start sm:self-auto overflow-x-auto">
              <button
                onClick={() => setFilter("ALL")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  filter === "ALL"
                    ? "bg-white dark:bg-sky-500/20 text-sky-600 dark:text-sky-300 font-bold shadow-2xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                All Students
              </button>
              <button
                onClick={() => setFilter("PENDING")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  filter === "PENDING"
                    ? "bg-white dark:bg-sky-500/20 text-sky-600 dark:text-sky-300 font-bold shadow-2xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                Pending Review
              </button>
              <button
                onClick={() => setFilter("APPROVED")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  filter === "APPROVED"
                    ? "bg-white dark:bg-sky-500/20 text-sky-600 dark:text-sky-300 font-bold shadow-2xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                Evaluated
              </button>
            </div>
          </div>

          {/* Student-Grouped Submissions Audit Table */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0B1120] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50 dark:bg-[#070A11]/60">
                    <th className="p-4">Student</th>
                    <th className="p-4">Assigned Mentor</th>
                    <th className="p-4">Pending Deliverables</th>
                    <th className="p-4">Total Submissions</th>
                    <th className="p-4">Latest Activity</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {isLoadingSubmissions ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400">
                        Loading student submissions audit...
                      </td>
                    </tr>
                  ) : (() => {
                    // Group submissions by student
                    const studentMap = new Map<string, any>();
                    submissionsAudit.forEach((sub: any) => {
                      const sKey = sub.studentId || sub.studentEmail || sub.studentName || "unknown";
                      if (!studentMap.has(sKey)) {
                        studentMap.set(sKey, {
                          studentId: sub.studentId,
                          studentName: sub.studentName || "Student",
                          studentEmail: sub.studentEmail || "",
                          studentPhone: sub.studentPhone || "",
                          mentorName: sub.mentorName || "—",
                          totalSubmissions: 0,
                          pendingCount: 0,
                          approvedCount: 0,
                          latestDate: sub.createdAt,
                          latestSub: sub,
                        });
                      }
                      const entry = studentMap.get(sKey)!;
                      entry.totalSubmissions += 1;
                      if (sub.status === "PENDING" || sub.status === "SUBMITTED") {
                        entry.pendingCount += 1;
                      } else {
                        entry.approvedCount += 1;
                      }
                      if (new Date(sub.createdAt) > new Date(entry.latestDate)) {
                        entry.latestDate = sub.createdAt;
                        entry.latestSub = sub;
                      }
                    });

                    let studentList = Array.from(studentMap.values());
                    if (filter === "PENDING") {
                      studentList = studentList.filter((s) => s.pendingCount > 0);
                    } else if (filter === "APPROVED") {
                      studentList = studentList.filter((s) => s.pendingCount === 0 && s.approvedCount > 0);
                    }

                    if (studentList.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="p-12 text-center text-slate-400">
                            No student records found matching this filter.
                          </td>
                        </tr>
                      );
                    }

                    return studentList.map((st: any) => (
                      <tr
                        key={st.studentId || st.studentEmail}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="p-4 font-medium">
                          <div className="text-slate-900 dark:text-white font-bold">
                            {st.studentName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {st.studentEmail || st.studentPhone || st.studentId}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {st.mentorName}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                              st.pendingCount > 0
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            }`}
                          >
                            {st.pendingCount} Pending
                          </span>
                        </td>
                        <td className="p-4 font-medium text-slate-700 dark:text-slate-300">
                          {st.totalSubmissions} Submitted
                        </td>
                        <td className="p-4 text-[11px] text-slate-400 font-mono">
                          {st.latestDate ? new Date(st.latestDate).toLocaleDateString() : "Recent"}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              if (st.studentId) {
                                setSelectedMenteeId(st.studentId);
                              }
                              setActiveTab("cockpit");
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-500/20 hover:text-sky-600 dark:hover:text-sky-400 rounded-xl transition-all cursor-pointer"
                          >
                            <span>Review Submissions</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
