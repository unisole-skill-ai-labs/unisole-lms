import React, { useState, useMemo, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Users,
  Search,
  BookOpen,
  GraduationCap,
  UserCheck,
  ShieldAlert,
  X,
  Check,
  Loader2,
  Trash2,
  Sparkles,
  Info,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  Copy,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
  ArrowUpDown,
  MoreVertical,
  UserMinus,
  ExternalLink,
} from "lucide-react";
import {
  useGetAdminStudentsQuery,
  useGetAdminCoursesQuery,
  useGetAdminMentorsQuery,
  useAssignMentorMutation,
  useUnassignMentorMutation,
  useUnenrollStudentMutation,
} from "../../store/apiSlice";
import { useAdminAnalytics } from "../../hooks/useAdminAnalytics";

// Named constants for learner activity status (D1)
// INACTIVE: No platform activity in 14+ days
// AT_RISK: No platform activity in 7+ days OR 2+ overdue activities
// ON_TRACK: Active within last 7 days and < 2 overdue items
const STATUS_CONFIG = {
  ON_TRACK: {
    label: "On Track",
    cls: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60",
    icon: CheckCircle2,
  },
  AT_RISK: {
    label: "At Risk",
    cls: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60",
    icon: AlertTriangle,
  },
  INACTIVE: {
    label: "Inactive",
    cls: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700",
    icon: Clock,
  },
};

export default function StudentsPage() {
  const { user } = useSelector((state: any) => state.auth);

  const userRoles = useMemo(() => {
    const primary = user?.role ? String(user.role).toUpperCase() : "";
    const secondary = Array.isArray(user?.roles)
      ? user.roles.map((r: any) => String(r).toUpperCase())
      : Array.isArray(user?.metadata?.roles)
      ? user.metadata.roles.map((r: any) => String(r).toUpperCase())
      : [];
    return [primary, ...secondary];
  }, [user]);

  const isAdmin = userRoles.includes("SUPER_ADMIN") || userRoles.includes("ADMIN");
  const isMentor = userRoles.includes("MENTOR") && !isAdmin;
  const isCourseManager =
    (userRoles.includes("COURSE_MANAGER") || userRoles.includes("PROGRAM_MANAGER")) && !isAdmin;

  // Filter & Search states
  const [selectedCourseId, setSelectedCourseId] = useState<string>("ALL");
  const [selectedMentorIdFilter, setSelectedMentorIdFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [assignmentFilter, setAssignmentFilter] = useState<"ALL" | "ASSIGNED" | "UNASSIGNED">("ALL");
  const [search, setSearch] = useState("");
  const [hideTestAccounts, setHideTestAccounts] = useState(false);

  // Sorting & Pagination states (D2: 25 per page)
  const [sortField, setSortField] = useState<"name" | "progress" | "lastActive" | "status">("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Bulk selection states (D3)
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [bulkAssignModalOpen, setBulkAssignModalOpen] = useState(false);
  const [bulkSelectedMentorId, setBulkSelectedMentorId] = useState("");

  // Student Detail Drawer state (D5)
  const [drawerStudent, setDrawerStudent] = useState<any | null>(null);

  // Unenroll Confirmation Dialog state
  const [unenrollModalStudent, setUnenrollModalStudent] = useState<any | null>(null);

  // Phone masking revelation map (D6)
  const [revealedPhones, setRevealedPhones] = useState<Record<string, boolean>>({});

  // Single assign modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [targetStudent, setTargetStudent] = useState<any>(null);
  const [selectedMentorId, setSelectedMentorId] = useState<string>("");
  const [assignmentCourseId, setAssignmentCourseId] = useState<string>("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Queries
  const { data: courses = [] } = useGetAdminCoursesQuery(undefined);
  const { data: mentors = [], isLoading: isLoadingMentors } = useGetAdminMentorsQuery(undefined);
  const {
    data: rawStudentsData = [],
    isLoading: isLoadingStudents,
    refetch: refetchStudents,
  } = useGetAdminStudentsQuery({
    role: "STUDENT",
    enrolledOnly: true,
    courseId: selectedCourseId !== "ALL" ? selectedCourseId : undefined,
  });

  const studentsList: any[] = useMemo(() => {
    if (Array.isArray(rawStudentsData)) return rawStudentsData;
    return (rawStudentsData as any)?.items || [];
  }, [rawStudentsData]);

  // Shared Analytics Hook for Canonical Count (Part F)
  const { canonicalEnrolledCount } = useAdminAnalytics({
    courseId: selectedCourseId !== "ALL" ? selectedCourseId : undefined,
  });

  // Mutations
  const [assignMentorApi, { isLoading: isAssigning }] = useAssignMentorMutation();
  const [unassignMentorApi, { isLoading: isUnassigning }] = useUnassignMentorMutation();
  const [unenrollStudentApi, { isLoading: isUnenrolling }] = useUnenrollStudentMutation();

  // Helper: Mask phone number (D6)
  const formatPhone = (phone?: string, studentId?: string) => {
    if (!phone) return "—";
    if (studentId && revealedPhones[studentId]) return phone;
    const digits = phone.replace(/\D/g, "");
    if (digits.length >= 10) {
      const last3 = digits.slice(-3);
      return `+91 ••••• ••${last3}`;
    }
    return phone;
  };

  const toggleRevealPhone = (studentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRevealedPhones((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  const copyToClipboard = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
  };

  // Filter students based on all criteria
  const processedStudents = useMemo(() => {
    let list = [...studentsList];

    // Filter test accounts if toggled (D7)
    if (hideTestAccounts) {
      list = list.filter((st: any) => {
        const p = String(st.phone || "");
        const em = String(st.email || "").toLowerCase();
        const nm = String(st.name || "").toLowerCase();
        const isDummyPhone = p.includes("999999") || p.includes("123456");
        const isDummyEmail = em.includes("test@") || em.includes("example.com");
        const isDummyName = nm.includes("test user") || nm.includes("sample");
        const hasTestMeta = st.metadata?.is_test === true || st.metadata?.test === true;
        return !(isDummyPhone || isDummyEmail || isDummyName || hasTestMeta);
      });
    }

    // Assignment filter (Assigned / Unassigned)
    if (assignmentFilter === "ASSIGNED") {
      list = list.filter((st: any) => Boolean(st.assignedMentor));
    } else if (assignmentFilter === "UNASSIGNED") {
      list = list.filter((st: any) => !st.assignedMentor);
    }

    // Mentor filter
    if (selectedMentorIdFilter !== "ALL") {
      list = list.filter(
        (st: any) =>
          st.assignedMentor?.mentorId === selectedMentorIdFilter ||
          st.assignedMentor?.mentorUserId === selectedMentorIdFilter
      );
    }

    // Status filter
    if (statusFilter !== "ALL") {
      list = list.filter((st: any) => st.status === statusFilter);
    }

    // Search query
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((st: any) => {
        const name = (st.name || "").toLowerCase();
        const phone = (st.phone || "").toLowerCase();
        const email = (st.email || "").toLowerCase();
        const mentor = (st.assignedMentor?.mentorName || "").toLowerCase();
        const course = (st.enrolledCourses || []).some(
          (c: any) => (c.title || "").toLowerCase().includes(q) || (c.slug || "").toLowerCase().includes(q)
        );
        return name.includes(q) || phone.includes(q) || email.includes(q) || mentor.includes(q) || course;
      });
    }

    // Sorting
    list.sort((a: any, b: any) => {
      let valA: any = "";
      let valB: any = "";

      if (sortField === "name") {
        valA = (a.name || "").toLowerCase();
        valB = (b.name || "").toLowerCase();
      } else if (sortField === "progress") {
        valA = a.progressPercent || 0;
        valB = b.progressPercent || 0;
      } else if (sortField === "lastActive") {
        valA = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
        valB = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
      } else if (sortField === "status") {
        valA = a.status || "";
        valB = b.status || "";
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return list;
  }, [
    studentsList,
    hideTestAccounts,
    assignmentFilter,
    selectedMentorIdFilter,
    statusFilter,
    search,
    sortField,
    sortAsc,
  ]);

  // Filter Chips Counts (D2)
  const filterCounts = useMemo(() => {
    return {
      all: studentsList.length,
      unassigned: studentsList.filter((s) => !s.assignedMentor).length,
      atRisk: studentsList.filter((s) => s.status === "AT_RISK").length,
      inactive: studentsList.filter((s) => s.status === "INACTIVE").length,
      onTrack: studentsList.filter((s) => s.status === "ON_TRACK").length,
    };
  }, [studentsList]);

  // Pagination calculation
  const totalStudentsCount = processedStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalStudentsCount / pageSize));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedStudents.slice(start, start + pageSize);
  }, [processedStudents, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCourseId, selectedMentorIdFilter, statusFilter, assignmentFilter, search, hideTestAccounts]);

  // Bulk Selection Handlers (D3)
  const allPageIds = useMemo(() => paginatedStudents.map((s) => s.id), [paginatedStudents]);
  const isAllPageSelected =
    allPageIds.length > 0 && allPageIds.every((id) => selectedStudentIds.includes(id));

  const toggleSelectAllPage = () => {
    if (isAllPageSelected) {
      setSelectedStudentIds((prev) => prev.filter((id) => !allPageIds.includes(id)));
    } else {
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...allPageIds])));
    }
  };

  const toggleSelectStudent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk Mentor Assign
  const handleBulkAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkSelectedMentorId || selectedStudentIds.length === 0) return;

    try {
      setFeedback(null);
      await assignMentorApi({
        mentorId: bulkSelectedMentorId,
        menteeIds: selectedStudentIds,
        courseId: selectedCourseId !== "ALL" ? selectedCourseId : undefined,
      }).unwrap();

      setFeedback({
        type: "success",
        message: `Successfully assigned ${selectedStudentIds.length} learners to the selected mentor!`,
      });
      setSelectedStudentIds([]);
      setBulkAssignModalOpen(false);
      refetchStudents();
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.data?.error || "Failed to execute bulk mentor assignment.",
      });
    }
  };

  // Unenroll Confirmation Handler (D5, Destructive Confirmation)
  const handleConfirmUnenroll = async () => {
    if (!unenrollModalStudent) return;
    try {
      await unenrollStudentApi({
        studentId: unenrollModalStudent.id,
        courseId: selectedCourseId !== "ALL" ? selectedCourseId : undefined,
      }).unwrap();

      setUnenrollModalStudent(null);
      setDrawerStudent(null);
      refetchStudents();
    } catch (err: any) {
      alert("Failed to unenroll student: " + (err?.data?.error || err.message));
    }
  };

  // CSV Export (D7 - Admin only)
  const handleExportCsv = () => {
    if (!isAdmin) return;
    const headers = [
      "ID",
      "Name",
      "Phone",
      "Email",
      "Enrolled Courses",
      "Assigned Mentor",
      "Progress %",
      "Status",
      "Last Active",
    ];

    const rows = processedStudents.map((st: any) => [
      st.id,
      `"${st.name || "Student"}"`,
      formatPhone(st.phone, st.id),
      st.email || "",
      `"${(st.enrolledCourses || []).map((c: any) => c.title).join(", ")}"`,
      `"${st.assignedMentor?.mentorName || "Unassigned"}"`,
      `${st.progressPercent || 0}%`,
      st.status || "ON_TRACK",
      st.lastActiveAt ? new Date(st.lastActiveAt).toLocaleString() : "Never",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `student_roster_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Single Mentor Assign Modal Handlers
  const openAssignModal = (student: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTargetStudent(student);
    const existing = student.assignedMentor?.mentorId || mentors[0]?.id || "";
    setSelectedMentorId(existing);
    const firstCourse = student.enrolledCourses?.[0]?.id || "";
    setAssignmentCourseId(firstCourse);
    setFeedback(null);
    setAssignModalOpen(true);
  };

  const handleSaveSingleAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudent || !selectedMentorId) return;

    try {
      await assignMentorApi({
        mentorId: selectedMentorId,
        menteeIds: [targetStudent.id],
        courseId: assignmentCourseId || undefined,
      }).unwrap();

      setAssignModalOpen(false);
      refetchStudents();
    } catch (err: any) {
      alert("Failed to assign mentor: " + (err?.data?.error || err.message));
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1600px] mx-auto animate-fade-in font-sans">
      {/* ------------------------------------------------------------- */}
      {/* Header & Canonical Roster Counts                              */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Users className="w-5 h-5 stroke-[2.2]" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {isMentor ? "My Assigned Mentees" : "Students & Mentor Allocation"}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isMentor
              ? "Your dedicated mentee roster with live activity status, coursework progress, and evaluation records."
              : "Studio student directory: Track academic progress, manage mentor balancing, and handle allocations."}
          </p>
        </div>

        {/* Header Right Badges & CSV Export (D7) */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-black px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/60 flex items-center gap-1.5 shadow-2xs">
            <GraduationCap className="w-4 h-4" />
            <span>
              {isMentor
                ? `My Mentees: ${studentsList.length}`
                : `Enrolled Students: ${canonicalEnrolledCount || studentsList.length}`}
            </span>
          </span>

          {isAdmin && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Filter Chips Bar with Live Counts (D2)                        */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => {
            setAssignmentFilter("ALL");
            setStatusFilter("ALL");
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            assignmentFilter === "ALL" && statusFilter === "ALL"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs"
              : "bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
          }`}
        >
          All Students ({filterCounts.all})
        </button>

        {!isMentor && (
          <button
            onClick={() => {
              setAssignmentFilter("UNASSIGNED");
              setStatusFilter("ALL");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              assignmentFilter === "UNASSIGNED"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 hover:bg-amber-100"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Unassigned ({filterCounts.unassigned})</span>
          </button>
        )}

        <button
          onClick={() => {
            setStatusFilter("AT_RISK");
            setAssignmentFilter("ALL");
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
            statusFilter === "AT_RISK"
              ? "bg-rose-600 text-white shadow-xs"
              : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60 hover:bg-rose-100"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>At Risk ({filterCounts.atRisk})</span>
        </button>

        <button
          onClick={() => {
            setStatusFilter("INACTIVE");
            setAssignmentFilter("ALL");
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            statusFilter === "INACTIVE"
              ? "bg-slate-700 text-white shadow-xs"
              : "bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
          }`}
        >
          Inactive ({filterCounts.inactive})
        </button>

        <button
          onClick={() => {
            setStatusFilter("ON_TRACK");
            setAssignmentFilter("ALL");
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
            statusFilter === "ON_TRACK"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 hover:bg-emerald-100"
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>On Track ({filterCounts.onTrack})</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Search & Dropdown Filters Bar (D2)                            */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student name, mentor, phone, or course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 shadow-2xs"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Course Scope Filter */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#0B1120] px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs shadow-2xs">
            <BookOpen className="w-3.5 h-3.5 text-purple-500 shrink-0" />
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Enrolled Courses</option>
              {courses.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Mentor Allocation Filter (Admin view) */}
          {!isMentor && (
            <div className="flex items-center gap-1.5 bg-white dark:bg-[#0B1120] px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs shadow-2xs">
              <UserCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <select
                value={selectedMentorIdFilter}
                onChange={(e) => setSelectedMentorIdFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Mentors</option>
                {mentors.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.activeMenteesCount || 0} students)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Hide Test Accounts Toggle (D7) */}
          <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 font-medium cursor-pointer shadow-2xs select-none">
            <input
              type="checkbox"
              checked={hideTestAccounts}
              onChange={(e) => setHideTestAccounts(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
            />
            <span>Hide test accounts</span>
          </label>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Bulk Action Bar (D3 - Admin Only)                             */}
      {/* ------------------------------------------------------------- */}
      {isAdmin && selectedStudentIds.length > 0 && (
        <div className="sticky top-2 z-30 p-3 sm:px-5 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-950 flex items-center justify-between shadow-xl animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-lg bg-purple-500 text-white text-xs font-black flex items-center justify-center">
              {selectedStudentIds.length}
            </span>
            <span className="text-xs font-bold">
              {selectedStudentIds.length} learner{selectedStudentIds.length === 1 ? "" : "s"} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBulkAssignModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Assign / Change Mentor</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedStudentIds([])}
              className="px-3 py-1.5 rounded-xl bg-slate-800 dark:bg-slate-200 text-slate-300 dark:text-slate-800 text-xs font-semibold hover:opacity-90 transition-all cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Students & Mentors Table (D1, D4)                             */}
      {/* ------------------------------------------------------------- */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0B1120] overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800/80 text-[11px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/50 dark:bg-[#070A11]/60">
                {isAdmin && (
                  <th className="py-3.5 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={toggleSelectAllPage}
                      className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                  </th>
                )}
                <th
                  onClick={() => {
                    setSortField("name");
                    setSortAsc(!sortAsc);
                  }}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Learner</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4">Course(s)</th>
                <th
                  onClick={() => {
                    setSortField("progress");
                    setSortAsc(!sortAsc);
                  }}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Progress</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    setSortField("lastActive");
                    setSortAsc(!sortAsc);
                  }}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Last Active</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    setSortField("status");
                    setSortAsc(!sortAsc);
                  }}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Assigned Mentor (Load)</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {isLoadingStudents ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="p-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                    <span>Loading student roster & canonical progress stats...</span>
                  </td>
                </tr>
              ) : paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="p-12 text-center text-slate-400">
                    No enrolled students matching the selected criteria.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((st: any) => {
                  const enrolledCourses: any[] = st.enrolledCourses || [];
                  const assignedMentor = st.assignedMentor;
                  const statusInfo = STATUS_CONFIG[st.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.ON_TRACK;
                  const StatusIcon = statusInfo.icon;
                  const isChecked = selectedStudentIds.includes(st.id);

                  return (
                    <tr
                      key={st.id}
                      onClick={() => setDrawerStudent(st)}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group"
                    >
                      {/* Checkbox (Admin Only) */}
                      {isAdmin && (
                        <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => toggleSelectStudent(st.id, e as any)}
                            className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                          />
                        </td>
                      )}

                      {/* Learner: Name, Avatar, masked ID (D1, D6) */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold flex items-center justify-center shrink-0 border border-purple-500/20 text-xs shadow-2xs">
                            {st.avatar ? (
                              <img src={st.avatar} alt={st.name} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                              (st.name || "S")[0].toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 dark:text-white truncate block">
                              {st.name || "Student"}
                            </span>
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono mt-0.5">
                              <span>{st.id.slice(0, 10)}</span>
                              <button
                                type="button"
                                onClick={(e) => copyToClipboard(st.id, e)}
                                className="p-0.5 hover:text-slate-600 dark:hover:text-slate-200"
                                title="Copy ID"
                              >
                                <Copy className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact: Masked Phone & Reveal Button (D6) */}
                      <td className="py-4 px-4 font-mono text-[11px]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {formatPhone(st.phone, st.id)}
                          </span>
                          {st.phone && (
                            <button
                              type="button"
                              onClick={(e) => toggleRevealPhone(st.id, e)}
                              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                              title={revealedPhones[st.id] ? "Mask Phone" : "Reveal Phone"}
                            >
                              {revealedPhones[st.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                        {st.email && (
                          <div className="text-[10px] text-slate-400 font-sans truncate max-w-[150px]">
                            {st.email}
                          </div>
                        )}
                      </td>

                      {/* Enrolled Courses */}
                      <td className="py-4 px-4">
                        {enrolledCourses.length > 0 ? (
                          <div className="space-y-1 max-w-[180px]">
                            {enrolledCourses.slice(0, 2).map((c: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-1.5 truncate">
                                <BookOpen className="w-3 h-3 text-purple-500 shrink-0" />
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                  {c.title}
                                </span>
                              </div>
                            ))}
                            {enrolledCourses.length > 2 && (
                              <span className="text-[10px] font-bold text-slate-400 pl-4.5">
                                +{enrolledCourses.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No courses</span>
                        )}
                      </td>

                      {/* Progress % with small bar (D1) */}
                      <td className="py-4 px-4">
                        <div className="space-y-1 w-24">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            <span>{st.progressPercent || 0}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-600 rounded-full"
                              style={{ width: `${st.progressPercent || 0}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Last Active */}
                      <td className="py-4 px-4 text-[11px] text-slate-500 font-medium">
                        {st.lastActiveAt ? new Date(st.lastActiveAt).toLocaleDateString([], { month: "short", day: "numeric" }) : "—"}
                      </td>

                      {/* Status (Never color alone, includes icon + label) (D1) */}
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.cls}`}>
                          <StatusIcon className="w-3 h-3" />
                          <span>{statusInfo.label}</span>
                        </span>
                      </td>

                      {/* Assigned Mentor with Load (D4) */}
                      <td className="py-4 px-4">
                        {assignedMentor ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center shrink-0 border border-blue-500/20 text-[11px]">
                              {(assignedMentor.mentorName || "M")[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-xs text-slate-900 dark:text-white truncate block">
                                {assignedMentor.mentorName}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                {assignedMentor.activeMenteesCount || 0} active mentees
                              </span>
                            </div>
                          </div>
                        ) : (
                          // Visible Warning Badge for Unassigned (D4)
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-extrabold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800/80 shadow-2xs">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Unassigned</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={(e) => openAssignModal(st, e)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-xs transition-all cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>{assignedMentor ? "Change" : "Assign"}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDrawerStudent(st)}
                            className="text-xs font-bold text-slate-500 hover:text-purple-600"
                          >
                            Details →
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* Pagination Bar (25 per page) (D2)                             */}
        {/* ------------------------------------------------------------- */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/30 dark:bg-[#070A11]/30">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Showing {Math.min(1, totalStudentsCount)} to {Math.min(currentPage * pageSize, totalStudentsCount)} of{" "}
            <strong className="text-slate-900 dark:text-white">{totalStudentsCount}</strong> learners
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Student Detail Drawer (D5)                                    */}
      {/* ------------------------------------------------------------- */}
      {drawerStudent && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setDrawerStudent(null)}
        >
          <aside
            className="w-full sm:w-[480px] h-full bg-white dark:bg-[#0B1120] border-l border-slate-200 dark:border-slate-800 p-6 shadow-2xl overflow-y-auto space-y-6 animate-slide-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-black text-lg flex items-center justify-center border border-purple-500/20 shadow-xs">
                  {(drawerStudent.name || "S")[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {drawerStudent.name || "Student"}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mt-0.5">
                    <span>{drawerStudent.id}</span>
                    <button
                      type="button"
                      onClick={(e) => copyToClipboard(drawerStudent.id, e)}
                      className="p-0.5 hover:text-slate-600"
                      title="Copy User ID"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDrawerStudent(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Academic Status Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070A11]/60 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Academic Status</span>
                {(() => {
                  const sInfo = STATUS_CONFIG[drawerStudent.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.ON_TRACK;
                  const SIcon = sInfo.icon;
                  return (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${sInfo.cls}`}>
                      <SIcon className="w-3 h-3" />
                      <span>{sInfo.label}</span>
                    </span>
                  );
                })()}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Course Progress</span>
                  <span>{drawerStudent.progressPercent || 0}%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600 rounded-full"
                    style={{ width: `${drawerStudent.progressPercent || 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Contact & Info</h4>
              <div className="p-4 rounded-2xl bg-white dark:bg-[#070A11] border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Mobile Phone:</span>
                  <div className="flex items-center gap-1 font-mono font-semibold">
                    <span>{formatPhone(drawerStudent.phone, drawerStudent.id)}</span>
                    <button
                      type="button"
                      onClick={(e) => toggleRevealPhone(drawerStudent.id, e)}
                      className="p-0.5 text-slate-400 hover:text-slate-600"
                    >
                      {revealedPhones[drawerStudent.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">Email Address:</span>
                  <span className="font-semibold">{drawerStudent.email || "—"}</span>
                </div>

                {drawerStudent.collegeName && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">College:</span>
                    <span className="font-semibold truncate max-w-[220px]">{drawerStudent.collegeName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Assigned Mentor Card */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Assigned Mentor</h4>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => openAssignModal(drawerStudent)}
                    className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    Change Mentor
                  </button>
                )}
              </div>

              {drawerStudent.assignedMentor ? (
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                      {drawerStudent.assignedMentor.mentorName}
                    </h5>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {drawerStudent.assignedMentor.specialization || "Technical Mentor"}
                    </p>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200">
                    {drawerStudent.assignedMentor.activeMenteesCount || 0} mentees
                  </span>
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-dashed border-amber-300 dark:border-amber-800/80 bg-amber-50/50 dark:bg-amber-950/20 text-center space-y-2">
                  <AlertCircle className="w-6 h-6 text-amber-500 mx-auto" />
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                    No Mentor Assigned Yet
                  </p>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => openAssignModal(drawerStudent)}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-xs cursor-pointer"
                    >
                      Allocate Mentor Now
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Enrolled Courses */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Enrolled Programs</h4>
              <div className="space-y-2">
                {(drawerStudent.enrolledCourses || []).map((c: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <BookOpen className="w-4 h-4 text-purple-600" />
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">{c.title}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Status: {c.status || "ACTIVE"}</div>
                      </div>
                    </div>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setUnenrollModalStudent({ ...drawerStudent, targetCourse: c })}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                        title="Unenroll student"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Unenroll Destructive Confirmation Modal (Admin Only)           */}
      {/* ------------------------------------------------------------- */}
      {unenrollModalStudent && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 animate-fade-in"
          onClick={() => setUnenrollModalStudent(null)}
        >
          <div
            className="bg-white dark:bg-[#0B1120] max-w-sm w-full rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Unenroll Student?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Are you sure you want to revoke {unenrollModalStudent.name}'s enrollment in{" "}
                  {unenrollModalStudent.targetCourse?.title || "this course"}?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setUnenrollModalStudent(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUnenrolling}
                onClick={handleConfirmUnenroll}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs cursor-pointer"
              >
                {isUnenrolling ? "Revoking..." : "Confirm Unenroll"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Bulk Assign Mentor Modal (D3)                                 */}
      {/* ------------------------------------------------------------- */}
      {bulkAssignModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in"
          onClick={() => setBulkAssignModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-[#0B1120] max-w-md w-full rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Bulk Assign Mentor
                </h3>
              </div>
              <button
                onClick={() => setBulkAssignModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Assign <strong>{selectedStudentIds.length}</strong> selected learners to a designated academic mentor.
            </p>

            <form onSubmit={handleBulkAssign} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Mentor (Current Workload Balance)
                </label>
                <select
                  required
                  value={bulkSelectedMentorId}
                  onChange={(e) => setBulkSelectedMentorId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070A11] text-xs font-semibold focus:outline-none"
                >
                  <option value="">Choose designated mentor...</option>
                  {mentors.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.activeMenteesCount || 0} active students) — {m.specialization || "Mentor"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setBulkAssignModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning || !bulkSelectedMentorId}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-xs"
                >
                  {isAssigning ? "Allocating..." : `Assign ${selectedStudentIds.length} Learners`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Single Assign Mentor Modal                                     */}
      {/* ------------------------------------------------------------- */}
      {assignModalOpen && targetStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in"
          onClick={() => setAssignModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-[#0B1120] max-w-md w-full rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Allocate Mentor: {targetStudent.name}
                </h3>
              </div>
              <button
                onClick={() => setAssignModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSingleAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Mentor (Current Workload Balance)
                </label>
                <select
                  required
                  value={selectedMentorId}
                  onChange={(e) => setSelectedMentorId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070A11] text-xs font-semibold focus:outline-none"
                >
                  <option value="">Choose mentor...</option>
                  {mentors.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.activeMenteesCount || 0} active students) — {m.specialization || "Mentor"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning || !selectedMentorId}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-xs"
                >
                  {isAssigning ? "Saving..." : "Save Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
