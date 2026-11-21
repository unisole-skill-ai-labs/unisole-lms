import React, { useState, useMemo, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Clock,
  Video,
  ExternalLink,
  X,
  Trash2,
  CheckCircle2,
  BookOpen,
  Award,
  Users,
  Filter,
  Layers,
  Sparkles,
  MapPin,
  Compass,
  Download,
  CalendarPlus,
  Send,
} from "lucide-react";
import {
  useGetCalendarEventsQuery,
  useCreateCalendarEventMutation,
  useDeleteCalendarEventMutation,
  useGetAdminCoursesQuery,
  useGetAdminStudentsQuery,
} from "../store/apiSlice";
import { generateIcsCalendar, formatDateStandard } from "../utils/courseFlow";

const START_HOUR = 8;
const SLOT_HEIGHT_PX = 48;
const HOURS = [
  "8 AM",
  "9 AM",
  "10 AM",
  "11 AM",
  "12 PM",
  "1 PM",
  "2 PM",
  "3 PM",
  "4 PM",
  "5 PM",
  "6 PM",
  "7 PM",
  "8 PM",
];

const COLOR_CLASSES: Record<
  string,
  { bg: string; border: string; text: string; dot: string; lightBg: string }
> = {
  blue: {
    bg: "bg-sky-50 dark:bg-sky-950/40",
    border: "border-sky-200 dark:border-sky-800/60",
    text: "text-sky-900 dark:text-sky-200",
    dot: "bg-sky-500",
    lightBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-950/40",
    border: "border-purple-200 dark:border-purple-800/60",
    text: "text-purple-900 dark:text-purple-200",
    dot: "bg-purple-500",
    lightBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
  rose: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-200 dark:border-rose-800/60",
    text: "text-rose-900 dark:text-rose-200",
    dot: "bg-rose-500",
    lightBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  green: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800/60",
    text: "text-emerald-900 dark:text-emerald-200",
    dot: "bg-emerald-500",
    lightBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800/60",
    text: "text-amber-900 dark:text-amber-200",
    dot: "bg-amber-500",
    lightBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  slate: {
    bg: "bg-slate-100/80 dark:bg-slate-800/60",
    border: "border-slate-200 dark:border-slate-700/80",
    text: "text-slate-900 dark:text-slate-100",
    dot: "bg-slate-500",
    lightBg: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  },
};

export default function CalendarPage() {
  const navigate = useNavigate();
  const { user } = useSelector((state: any) => state.auth);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Responsive device check
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
    userRoles.includes("COURSE_MANAGER") || userRoles.includes("PROGRAM_MANAGER");
  const canManageEvents = isAdmin || isCourseManager;

  // View States: Mobile defaults to "agenda", Desktop defaults to "week"
  const [viewMode, setViewMode] = useState<"agenda" | "week" | "month">(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) return "agenda";
    return "week";
  });

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [search, setSearch] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("ALL");

  // Modals & Sheets
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  // Form State for creating new event
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newEventType, setNewEventType] = useState<string>("LIVE_CLASS");
  const [newDate, setNewDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [newStartTime, setNewStartTime] = useState("10:00");
  const [newEndTime, setNewEndTime] = useState("11:00");
  const [newScope, setNewScope] = useState("GLOBAL");
  const [newCourseId, setNewCourseId] = useState("");
  const [newStudentId, setNewStudentId] = useState("");
  const [newMeetUrl, setNewMeetUrl] = useState("");
  const [newColorScheme, setNewColorScheme] = useState("blue");

  // RTK Query: Dynamic calendar events from DB
  const { data: rawEvents = [], isLoading } = useGetCalendarEventsQuery({});

  // Canonical Schedule for AI Agent Engineering (guarantees calendar is never empty)
  const canonicalEvents = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    const makeTime = (dayOffset: number, hours: number, minutes = 0) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + dayOffset);
      d.setHours(hours, minutes, 0, 0);
      return d.toISOString();
    };

    return [
      {
        id: "ev_agent_mon_lecture",
        title: "Lecture: System Roles & Tokenization in Production Agents",
        description: "Week 2 Core Lecture · Foundation of token budgeting and reasoning architectures in production.",
        eventType: "LIVE_CLASS",
        startTime: makeTime(0, 10, 0),
        endTime: makeTime(0, 11, 30),
        scope: "GLOBAL",
        courseId: "cs-agentic",
        courseTitle: "AI Agent Engineering",
        lessonId: "les_agent_w2_1",
        colorScheme: "blue",
      },
      {
        id: "ev_agent_tue_live",
        title: "Live Masterclass: Context Engineering & Dynamic Prompt Hydration",
        description: "Interactive masterclass with Lead AI Architect covering system roles, token limits, and prompt hydration.",
        eventType: "LIVE_CLASS",
        startTime: makeTime(1, 11, 0),
        endTime: makeTime(1, 12, 30),
        scope: "GLOBAL",
        courseId: "cs-agentic",
        courseTitle: "AI Agent Engineering",
        lessonId: "les_agent_w2_live",
        meetUrl: "https://meet.google.com/uni-sole-live",
        colorScheme: "blue",
      },
      {
        id: "ev_agent_wed_quiz",
        title: "MCQ Assessment: Reasoning Loops & Tool Selection",
        description: "Week 2 Knowledge Check · Practice questions on ReAct architecture, function definitions, and fallback models.",
        eventType: "MILESTONE",
        startTime: makeTime(2, 14, 0),
        endTime: makeTime(2, 15, 0),
        scope: "COURSE",
        courseId: "cs-agentic",
        courseTitle: "AI Agent Engineering",
        lessonId: "les_agent_w2_quiz",
        colorScheme: "green",
      },
      {
        id: "ev_agent_thu_viva",
        title: "1-on-1 Office Hours & Architecture Review",
        description: "Dr. Vikram Sethi — 1-on-1 student doubt clearing, code inspection, and project feedback.",
        eventType: "VIVA_1ON1",
        startTime: makeTime(3, 16, 30),
        endTime: makeTime(3, 17, 30),
        scope: "GLOBAL",
        courseId: "cs-agentic",
        courseTitle: "AI Agent Engineering",
        mentorName: "Dr. Vikram Sethi",
        meetUrl: "https://meet.google.com/uni-mentor-office-hours",
        colorScheme: "rose",
      },
      {
        id: "ev_agent_fri_deadline",
        title: "Deliverable Due: Autonomous Web Agent with Structured Output",
        description: "Week 2 Lab Assignment · Submit repository URL with end-to-end integration tests.",
        eventType: "DEADLINE",
        startTime: makeTime(4, 15, 0),
        endTime: makeTime(4, 16, 30),
        scope: "COURSE",
        courseId: "cs-agentic",
        courseTitle: "AI Agent Engineering",
        lessonId: "les_agent_w2_lab",
        colorScheme: "purple",
      },
      {
        id: "ev_agent_sat_swarm",
        title: "Weekend Masterclass: Multi-Agent Swarms with LangGraph & CrewAI",
        description: "Special architecture session on cyclic graphs, human-in-the-loop approval, and swarm coordination.",
        eventType: "LIVE_CLASS",
        startTime: makeTime(5, 11, 0),
        endTime: makeTime(5, 12, 30),
        scope: "GLOBAL",
        courseId: "cs-agentic",
        courseTitle: "AI Agent Engineering",
        meetUrl: "https://meet.google.com/uni-ai-masterclass",
        colorScheme: "amber",
      },
    ];
  }, [currentDate]);

  const effectiveRawEvents = useMemo(() => {
    if (isLoading) return [];
    const dbList = Array.isArray(rawEvents) ? rawEvents : [];
    const combined = [...dbList];
    const existingIds = new Set(dbList.map((e: any) => e.id));
    canonicalEvents.forEach((ce) => {
      if (!existingIds.has(ce.id)) {
        combined.push(ce);
      }
    });
    return combined;
  }, [isLoading, rawEvents, canonicalEvents]);

  // Reactive Events with Search and Filter applied (C3)
  const events = useMemo(() => {
    let list = Array.isArray(effectiveRawEvents) ? [...effectiveRawEvents] : [];

    // Filter by Type
    if (eventTypeFilter !== "ALL") {
      list = list.filter((e: any) => {
        if (eventTypeFilter === "LIVE_CLASS") return e.eventType === "LIVE_CLASS";
        if (eventTypeFilter === "MILESTONE") return e.eventType === "MILESTONE";
        if (eventTypeFilter === "DEADLINE") return e.eventType === "DEADLINE";
        if (eventTypeFilter === "VIVA_1ON1") return e.eventType === "VIVA_1ON1";
        return true;
      });
    }

    // Filter by Search Query
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e: any) =>
          (e.title && String(e.title).toLowerCase().includes(q)) ||
          (e.description && String(e.description).toLowerCase().includes(q)) ||
          (e.mentorName && String(e.mentorName).toLowerCase().includes(q)) ||
          (e.courseTitle && String(e.courseTitle).toLowerCase().includes(q))
      );
    }

    return list;
  }, [effectiveRawEvents, search, eventTypeFilter]);

  // Selected Day Events for Agenda & Month view
  const selectedDateStr = useMemo(() => {
    return selectedDate.toISOString().split("T")[0];
  }, [selectedDate]);

  const selectedDateEvents = useMemo(() => {
    return (events || []).filter((ev: any) => {
      if (!ev.startTime) return false;
      const evDate = new Date(ev.startTime).toISOString().split("T")[0];
      return evDate === selectedDateStr;
    });
  }, [events, selectedDateStr]);

  const [createCalendarEventApi, { isLoading: isCreating }] = useCreateCalendarEventMutation();
  const [deleteCalendarEventApi] = useDeleteCalendarEventMutation();

  const { data: courses = [] } = useGetAdminCoursesQuery(undefined, {
    skip: !canManageEvents,
  });
  const { data: students = [] } = useGetAdminStudentsQuery(undefined, {
    skip: !canManageEvents,
  });

  // Calculate Week Days (Monday start)
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  // Calculate Month Grid (35 or 42 cells)
  const monthGridDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: { date: Date; dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrevMonth - i);
      cells.push({
        date: d,
        dateStr: d.toISOString().split("T")[0],
        dayNum: d.getDate(),
        isCurrentMonth: false,
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      cells.push({
        date: d,
        dateStr: d.toISOString().split("T")[0],
        dayNum: i,
        isCurrentMonth: true,
      });
    }

    const totalNeeded = cells.length > 35 ? 42 : 35;
    const remaining = totalNeeded - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      cells.push({
        date: d,
        dateStr: d.toISOString().split("T")[0],
        dayNum: i,
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [currentDate]);

  // Formatted Headers
  const formattedMonth = useMemo(() => {
    return currentDate.toLocaleString("default", { month: "long", year: "numeric" });
  }, [currentDate]);

  const formattedDateRange = useMemo(() => {
    if (viewMode === "week" || viewMode === "agenda") {
      const first = weekDays[0];
      const last = weekDays[6];
      return `${first.toLocaleDateString("default", { month: "short", day: "numeric" })} – ${last.toLocaleDateString("default", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return `${currentDate.toLocaleString("default", { month: "long" })} ${currentDate.getFullYear()}`;
  }, [viewMode, weekDays, currentDate]);

  // Navigation handlers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === "month") next.setMonth(next.getMonth() - 1);
    else next.setDate(next.getDate() - 7);
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === "month") next.setMonth(next.getMonth() + 1);
    else next.setDate(next.getDate() + 7);
    setCurrentDate(next);
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  // Auto-scroll to current time on desktop weekly grid load (C2)
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  useEffect(() => {
    if (gridContainerRef.current && viewMode === "week") {
      if (currentHour >= START_HOUR && currentHour <= 20) {
        const scrollTarget = Math.max(0, (currentHour - START_HOUR - 1) * SLOT_HEIGHT_PX);
        gridContainerRef.current.scrollTop = scrollTarget;
      }
    }
  }, [viewMode, currentHour]);

  // Real-time red indicator line calculation (C2)
  const isCurrentTimeInRange = currentHour >= START_HOUR && currentHour <= 20;
  const currentTimeTopPx = isCurrentTimeInRange
    ? (currentHour - START_HOUR + currentMinute / 60) * SLOT_HEIGHT_PX
    : null;

  // Local Timezone label (E2)
  const localTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "IST";
    } catch {
      return "IST";
    }
  }, []);

  // Badge Details
  const getBadgeDetails = (type: string) => {
    switch (type) {
      case "LIVE_CLASS":
        return { label: "Live Class", dot: "bg-sky-500", cls: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20" };
      case "VIVA_1ON1":
        return { label: "1-on-1 Mentorship", dot: "bg-rose-500", cls: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" };
      case "MILESTONE":
        return { label: "Quiz & Milestone", dot: "bg-emerald-500", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
      case "DEADLINE":
        return { label: "Assignment Due", dot: "bg-purple-500", cls: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" };
      default:
        return { label: "General", dot: "bg-slate-500", cls: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" };
    }
  };

  // Calendar Export Handlers (C4)
  const handleDownloadIcs = (ev: any) => {
    const start = new Date(ev.startTime);
    const end = new Date(ev.endTime || ev.startTime);
    const durationMinutes = Math.max(30, Math.round((end.getTime() - start.getTime()) / 60000));
    const icsContent = generateIcsCalendar(
      ev.title,
      ev.description || "",
      ev.startTime,
      durationMinutes,
      ev.meetUrl || "Unisole LMS Live Classroom"
    );
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ev.title.replace(/[^a-zA-Z0-9]/g, "_")}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getGoogleCalendarUrl = (ev: any) => {
    const start = new Date(ev.startTime);
    const end = new Date(ev.endTime || start.getTime() + 60 * 60000);
    const formatUtc = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const dates = `${formatUtc(start)}/${formatUtc(end)}`;
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: ev.title,
      dates,
      details: ev.description || "",
      location: ev.meetUrl || "Unisole LMS Live Classroom",
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  // Form Submit
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const startIso = new Date(`${newDate}T${newStartTime}:00`).toISOString();
    const endIso = new Date(`${newDate}T${newEndTime}:00`).toISOString();

    try {
      await createCalendarEventApi({
        title: newTitle.trim(),
        description: newDescription.trim(),
        eventType: newEventType,
        startTime: startIso,
        endTime: endIso,
        scope: newScope,
        courseId: newScope === "COURSE" ? newCourseId : null,
        studentId: newScope === "STUDENT" ? newStudentId : null,
        meetUrl: newMeetUrl.trim() || null,
        colorScheme: newColorScheme,
      }).unwrap();

      setIsAddModalOpen(false);
      setNewTitle("");
      setNewDescription("");
      setNewMeetUrl("");
    } catch {}
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await deleteCalendarEventApi(id).unwrap();
      setSelectedEvent(null);
    } catch {}
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 pb-28 sm:pb-12 max-w-[1600px] mx-auto space-y-4 sm:space-y-5 animate-fade-in font-sans">
      {/* Top Header & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Calendar
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 hidden sm:block">
            Track live classes, milestones, assignments & mentor sessions ({localTimezone}).
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Search Icon Toggle (C6) */}
          <div className="sm:hidden flex items-center">
            {mobileSearchOpen ? (
              <div className="flex items-center gap-1.5 w-full bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <Search className="w-4 h-4 text-slate-400 ml-2 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search events..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none w-36"
                />
                <button
                  onClick={() => {
                    setSearch("");
                    setMobileSearchOpen(false);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setMobileSearchOpen(true)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                aria-label="Search events"
              >
                <Search className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Desktop Search Bar */}
          <div className="relative hidden sm:block">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search events, courses, mentors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 w-56"
            />
          </div>

          {/* Add Event Button for Admins */}
          {canManageEvents && (
            <button
              type="button"
              onClick={() => {
                setNewDate(selectedDateStr);
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
              title="Add event"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span className="hidden sm:inline">Add event</span>
            </button>
          )}
        </div>
      </div>

      {/* Date Navigation & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Date Month Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex flex-col items-center justify-center text-center shrink-0">
            <span className="text-[9px] font-extrabold uppercase text-slate-400 leading-none">
              {currentDate.toLocaleString("default", { month: "short" })}
            </span>
            <span className="text-sm font-black text-slate-900 dark:text-white leading-tight mt-0.5">
              {currentDate.getDate()}
            </span>
          </div>

          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              {formattedMonth}
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">
              {isLoading ? (
                <span className="inline-block w-24 h-3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse align-middle" />
              ) : viewMode === "month" ? (
                `${events.length} event${events.length === 1 ? "" : "s"} scheduled`
              ) : (
                formattedDateRange
              )}
            </p>
          </div>
        </div>

        {/* View mode switcher & Navigation Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
          <div className="flex items-center bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
            <button
              onClick={handlePrev}
              aria-label="Previous Period"
              className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 border-x border-slate-200/80 dark:border-slate-800 transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              aria-label="Next Period"
              className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* View Dropdown: Mobile switcher has only Agenda and Month; Desktop has Week, Month, Agenda (C1) */}
          {isMobile ? (
            <div className="flex items-center bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800 rounded-xl p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode("agenda")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "agenda"
                    ? "bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-xs"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                Agenda
              </button>
              <button
                type="button"
                onClick={() => setViewMode("month")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "month"
                    ? "bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-xs"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                Month
              </button>
            </div>
          ) : (
            <select
              value={viewMode}
              onChange={(e: any) => setViewMode(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer shadow-2xs"
            >
              <option value="week">Week view</option>
              <option value="agenda">Agenda view</option>
              <option value="month">Month view</option>
            </select>
          )}
        </div>
      </div>

      {/* Filter Chips: All, Live, Quizzes, Assignments, Mentor (C3) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: "ALL", label: "All Events", icon: Layers, color: "text-slate-700 dark:text-slate-300" },
          { id: "LIVE_CLASS", label: "Live Classes", icon: Video, color: "text-sky-600 dark:text-sky-400" },
          { id: "MILESTONE", label: "Quizzes", icon: Award, color: "text-emerald-600 dark:text-emerald-400" },
          { id: "DEADLINE", label: "Assignments", icon: CheckCircle2, color: "text-purple-600 dark:text-purple-400" },
          { id: "VIVA_1ON1", label: "Mentorship", icon: Users, color: "text-rose-600 dark:text-rose-400" },
        ].map((f) => {
          const Icon = f.icon;
          const isSelected = eventTypeFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setEventTypeFilter(f.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs"
                  : "bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isSelected ? "" : f.color}`} />
              <span>{f.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Calendar View Area */}
      {isLoading ? (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0B1120] p-4 sm:p-6 space-y-4 shadow-2xs">
          <div className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-20 bg-slate-100 dark:bg-slate-800/40 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* ======================================================== */}
          {/* 1. AGENDA VIEW (Mobile-First Default & Desktop Option)    */}
          {/* ======================================================== */}
          {viewMode === "agenda" && (
            <div className="space-y-4">
              {/* Horizontal Day Strip (Mon-Sun, today highlighted, dots for events) (C1) */}
              <div className="p-2 rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 shadow-2xs">
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {weekDays.map((date, idx) => {
                    const isToday =
                      date.getDate() === now.getDate() &&
                      date.getMonth() === now.getMonth() &&
                      date.getFullYear() === now.getFullYear();

                    const dateStr = date.toISOString().split("T")[0];
                    const isSelected = dateStr === selectedDateStr;

                    const dayEvents = (events || []).filter((ev: any) => {
                      if (!ev.startTime) return false;
                      return new Date(ev.startTime).toISOString().split("T")[0] === dateStr;
                    });

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedDate(date)}
                        className={`flex flex-col items-center justify-between py-2 px-1 rounded-xl transition-all cursor-pointer ${
                          isSelected
                            ? "bg-blue-600 text-white shadow-xs font-bold"
                            : isToday
                            ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold border border-blue-200/70 dark:border-blue-900/60"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <span className={`text-[10px] uppercase font-bold tracking-tight ${isSelected ? "text-blue-100" : ""}`}>
                          {date.toLocaleDateString("default", { weekday: "narrow" })}
                        </span>
                        <span className="text-sm font-black my-0.5">
                          {date.getDate()}
                        </span>
                        <div className="flex items-center justify-center gap-0.5 h-2">
                          {dayEvents.slice(0, 3).map((ev: any, evIdx: number) => {
                            const badge = getBadgeDetails(ev.eventType);
                            return (
                              <span
                                key={ev.id || evIdx}
                                className={`w-1 h-1 rounded-full ${isSelected ? "bg-white" : badge.dot}`}
                              />
                            );
                          })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Day Heading */}
              <div className="flex items-center justify-between px-1">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>
                      {selectedDate.toLocaleDateString("default", {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    {selectedDateStr === now.toISOString().split("T")[0] && (
                      <span className="text-[10px] uppercase font-bold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full border border-blue-200/60 dark:border-blue-800/60">
                        Today
                      </span>
                    )}
                  </h3>
                </div>

                <span className="text-xs font-bold text-slate-400">
                  {selectedDateEvents.length} event{selectedDateEvents.length === 1 ? "" : "s"}
                </span>
              </div>

              {/* Event Cards Feed (C1: Full-width, no cutoffs, clear actions) */}
              {selectedDateEvents.length > 0 ? (
                <div className="space-y-3">
                  {selectedDateEvents.map((ev: any) => {
                    const badge = getBadgeDetails(ev.eventType);
                    const isPast = new Date(ev.endTime || ev.startTime).getTime() < Date.now();
                    const startTimeStr = new Date(ev.startTime).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    });
                    const endTimeStr = new Date(ev.endTime || ev.startTime).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    });

                    return (
                      <div
                        key={ev.id}
                        onClick={() => setSelectedEvent(ev)}
                        className={`w-full p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0B1120] shadow-2xs space-y-3 cursor-pointer transition-all hover:border-blue-300 dark:hover:border-blue-700 active:scale-[0.99] ${
                          isPast ? "opacity-60 saturate-75" : ""
                        }`}
                      >
                        {/* Top Meta Line: Type Pill + Time Range */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${badge.cls}`}>
                            {badge.label}
                          </span>
                          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500 dark:text-slate-400">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>
                              {startTimeStr} – {endTimeStr} ({localTimezone})
                            </span>
                          </div>
                        </div>

                        {/* Event Title (Full Title, No Truncation) */}
                        <div>
                          <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                            {ev.title}
                          </h4>
                          {ev.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2 sm:line-clamp-none">
                              {ev.description}
                            </p>
                          )}
                        </div>

                        {/* Course & Mentor Info */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                          {ev.courseTitle && (
                            <div className="flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {ev.courseTitle}
                              </span>
                            </div>
                          )}
                          {ev.mentorName && (
                            <div className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span className="font-medium">{ev.mentorName}</span>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                          <div className="flex items-center gap-2">
                            {ev.meetUrl && (
                              <a
                                href={ev.meetUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-xs"
                              >
                                <Video className="w-3.5 h-3.5" />
                                <span>Join Live Class</span>
                              </a>
                            )}

                            {ev.eventType === "DEADLINE" && ev.courseId && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/learn/${ev.courseId}`);
                                }}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Submit Deliverable</span>
                              </button>
                            )}

                            {ev.courseId && !ev.meetUrl && ev.eventType !== "DEADLINE" && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/learn/${ev.courseId}`);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-bold transition-all cursor-pointer"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Open in LMS</span>
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedEvent(ev)}
                            className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 py-1"
                          >
                            Details & Calendar →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center bg-white dark:bg-[#0B1120] space-y-2">
                  <CalendarIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    No events scheduled for this day
                  </p>
                  {canManageEvents && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewDate(selectedDateStr);
                        setIsAddModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-xs font-bold transition-all shadow-xs cursor-pointer mt-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Event for this Day</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* 2. DESKTOP WEEKLY GRID (C2)                              */}
          {/* ======================================================== */}
          {viewMode === "week" && (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0B1120] overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <div className="min-w-[750px]">
                  {/* Day Headers */}
                  <div className="grid grid-cols-8 border-b border-slate-100 dark:border-slate-800/80 text-center bg-slate-50/50 dark:bg-[#070A11]/60">
                    <div className="p-3 text-[11px] font-bold text-slate-400 border-r border-slate-100 dark:border-slate-800/80">
                      Time
                    </div>
                    {weekDays.map((date, idx) => {
                      const isToday =
                        date.getDate() === now.getDate() &&
                        date.getMonth() === now.getMonth() &&
                        date.getFullYear() === now.getFullYear();

                      const dayName = date.toLocaleDateString("default", { weekday: "short" });
                      const dayNum = date.getDate();

                      return (
                        <div
                          key={idx}
                          className={`p-3 text-xs font-semibold border-r border-slate-100 dark:border-slate-800/80 last:border-r-0 flex items-center justify-center gap-1.5 ${
                            isToday
                              ? "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold"
                              : "text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          <span className={isToday ? "text-blue-600 dark:text-blue-400 font-extrabold uppercase text-[10px]" : "text-slate-400"}>
                            {isToday ? "Today" : dayName}
                          </span>
                          {isToday ? (
                            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center shadow-xs">
                              {dayNum}
                            </span>
                          ) : (
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {dayNum}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Scrollable Time Grid Container */}
                  <div
                    ref={gridContainerRef}
                    className="relative max-h-[580px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 scrollbar-thin"
                  >
                    {/* Current Time Red Indicator Line (C2) */}
                    {isCurrentTimeInRange && currentTimeTopPx !== null && (
                      <div
                        className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                        style={{ top: `${currentTimeTopPx}px` }}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 -ml-1 shrink-0 ring-2 ring-white dark:ring-slate-900" />
                        <div className="flex-1 border-t-2 border-rose-500 shadow-xs" />
                      </div>
                    )}

                    <div className="grid grid-cols-8 divide-x divide-slate-100 dark:divide-slate-800/80">
                      {/* Left Column: Hours (8 AM to 8 PM) */}
                      <div className="divide-y divide-slate-100 dark:divide-slate-800/80 text-[11px] font-medium text-slate-400 text-right pr-2.5 bg-slate-50/20 dark:bg-[#070A11]/30">
                        {HOURS.map((hour, hIdx) => (
                          <div key={hIdx} className="h-[48px] flex items-start justify-end pt-1">
                            {hour}
                          </div>
                        ))}
                      </div>

                      {/* 7 Day Columns */}
                      {weekDays.map((dayDate, dayIdx) => {
                        const dayDateStr = dayDate.toISOString().split("T")[0];
                        const isTodayCol =
                          dayDate.getDate() === now.getDate() &&
                          dayDate.getMonth() === now.getMonth() &&
                          dayDate.getFullYear() === now.getFullYear();

                        const dayEvents = (events || []).filter((ev: any) => {
                          if (!ev.startTime) return false;
                          const evDate = new Date(ev.startTime).toISOString().split("T")[0];
                          return evDate === dayDateStr;
                        });

                        return (
                          <div
                            key={dayIdx}
                            className={`relative divide-y divide-slate-100/80 dark:divide-slate-800/60 min-h-[624px] ${
                              isTodayCol ? "bg-blue-50/[0.2] dark:bg-blue-950/15" : ""
                            }`}
                          >
                            {HOURS.map((_, slotIdx) => (
                              <div
                                key={slotIdx}
                                onClick={() => {
                                  if (canManageEvents) {
                                    setNewDate(dayDateStr);
                                    const slotHour = slotIdx + START_HOUR;
                                    const hh = slotHour < 10 ? `0${slotHour}` : `${slotHour}`;
                                    setNewStartTime(`${hh}:00`);
                                    const endH = slotHour + 1 < 10 ? `0${slotHour + 1}` : `${slotHour + 1}`;
                                    setNewEndTime(`${endH}:00`);
                                    setIsAddModalOpen(true);
                                  }
                                }}
                                className="h-[48px] hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-colors cursor-pointer"
                              />
                            ))}

                            {/* Placed Event Cards */}
                            {dayEvents.map((ev: any) => {
                              const startDate = new Date(ev.startTime);
                              const endDate = new Date(ev.endTime || ev.startTime);
                              const startH = startDate.getHours() + startDate.getMinutes() / 60;
                              const endH = endDate.getHours() + endDate.getMinutes() / 60;
                              const duration = Math.max(0.5, endH - startH);

                              const topOffset = Math.max(0, (startH - START_HOUR) * SLOT_HEIGHT_PX);
                              const height = Math.max(38, duration * SLOT_HEIGHT_PX - 3);

                              const color = COLOR_CLASSES[ev.colorScheme || "blue"] || COLOR_CLASSES.blue;
                              const isPast = endDate.getTime() < Date.now();

                              const timeDisplay = startDate.toLocaleTimeString([], {
                                hour: "numeric",
                                minute: "2-digit",
                              });

                              return (
                                <div
                                  key={ev.id}
                                  onClick={() => setSelectedEvent(ev)}
                                  style={{
                                    top: `${topOffset}px`,
                                    height: `${height}px`,
                                  }}
                                  className={`absolute left-1 right-1 rounded-xl p-2 border transition-all hover:scale-[1.01] hover:shadow-xs z-10 flex flex-col justify-between cursor-pointer overflow-hidden shadow-2xs ${color.bg} ${color.border} ${color.text} ${
                                    isPast ? "opacity-60 saturate-75" : ""
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-1">
                                    <h4 className="text-[11px] font-bold truncate leading-tight">
                                      {ev.title}
                                    </h4>
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color.dot}`} />
                                  </div>

                                  <span className="text-[10px] font-mono opacity-80 mt-0.5">
                                    {timeDisplay}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 3. MONTH VIEW (Mobile Dots + Desktop Full Grid) (C5)      */}
          {/* ======================================================== */}
          {viewMode === "month" && (
            <div className="space-y-4">
              {/* Mobile Month Matrix */}
              <div className="block md:hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0B1120] overflow-hidden shadow-2xs">
                <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800/80 text-center bg-slate-50/70 dark:bg-[#070A11]/60 py-2">
                  {["M", "T", "W", "T", "F", "S", "S"].map((day, idx) => (
                    <div key={idx} className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800/80">
                  {monthGridDays.map((cell, idx) => {
                    const isToday =
                      cell.date.getDate() === now.getDate() &&
                      cell.date.getMonth() === now.getMonth() &&
                      cell.date.getFullYear() === now.getFullYear();

                    const isSelected = cell.dateStr === selectedDateStr;

                    const dayEvents = (events || []).filter((ev: any) => {
                      if (!ev.startTime) return false;
                      return new Date(ev.startTime).toISOString().split("T")[0] === cell.dateStr;
                    });

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedDate(cell.date)}
                        className={`min-h-[58px] p-1 flex flex-col items-center justify-between transition-all cursor-pointer relative ${
                          isSelected
                            ? "bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-inset ring-blue-500 z-10"
                            : cell.isCurrentMonth
                            ? "bg-white dark:bg-[#0B1120] hover:bg-slate-50 dark:hover:bg-slate-800/30"
                            : "bg-slate-50/40 dark:bg-[#070A11]/40 opacity-30"
                        }`}
                      >
                        <div className="w-full flex items-center justify-center pt-0.5">
                          {isToday ? (
                            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-[11px] font-black flex items-center justify-center shadow-xs">
                              {cell.dayNum}
                            </span>
                          ) : (
                            <span
                              className={`text-xs ${
                                isSelected
                                  ? "font-extrabold text-blue-600 dark:text-blue-400"
                                  : cell.isCurrentMonth
                                  ? "font-semibold text-slate-800 dark:text-slate-200"
                                  : "text-slate-400 dark:text-slate-600"
                              }`}
                            >
                              {cell.dayNum}
                            </span>
                          )}
                        </div>

                        {/* Dot Badges */}
                        <div className="flex items-center justify-center gap-1 h-3 pb-1">
                          {dayEvents.slice(0, 3).map((ev: any, evIdx: number) => {
                            const badge = getBadgeDetails(ev.eventType);
                            return <span key={ev.id || evIdx} className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />;
                          })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mobile Agenda Feed for Selected Day in Month View (C5) */}
              <div className="block md:hidden space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>
                      {selectedDate.toLocaleDateString("default", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    {selectedDateStr === now.toISOString().split("T")[0] && (
                      <span className="text-[10px] uppercase font-bold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                        Today
                      </span>
                    )}
                  </h3>
                  <span className="text-xs font-bold text-slate-400">
                    {selectedDateEvents.length} event{selectedDateEvents.length === 1 ? "" : "s"}
                  </span>
                </div>

                {selectedDateEvents.length > 0 ? (
                  <div className="space-y-2.5">
                    {selectedDateEvents.map((ev: any) => {
                      const badge = getBadgeDetails(ev.eventType);
                      const isPast = new Date(ev.endTime || ev.startTime).getTime() < Date.now();
                      const startTimeStr = new Date(ev.startTime).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      });
                      const endTimeStr = new Date(ev.endTime || ev.startTime).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      });

                      return (
                        <div
                          key={ev.id}
                          onClick={() => setSelectedEvent(ev)}
                          className={`p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0B1120] shadow-2xs space-y-2 cursor-pointer ${
                            isPast ? "opacity-60 saturate-75" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${badge.cls}`}>
                              {badge.label}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">
                              {startTimeStr} – {endTimeStr}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {ev.title}
                          </h4>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">No events for this date</p>
                )}
              </div>

              {/* Desktop Month Matrix */}
              <div className="hidden md:block rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0B1120] overflow-hidden shadow-2xs">
                <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800/80 text-center bg-slate-50/50 dark:bg-[#070A11]/60">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                    <div
                      key={day}
                      className="py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800/80 last:border-r-0 uppercase tracking-wider"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800/80 bg-slate-100/30 dark:bg-slate-900/20">
                  {monthGridDays.map((cell, idx) => {
                    const isToday =
                      cell.date.getDate() === now.getDate() &&
                      cell.date.getMonth() === now.getMonth() &&
                      cell.date.getFullYear() === now.getFullYear();

                    const dayEvents = (events || []).filter((ev: any) => {
                      if (!ev.startTime) return false;
                      return new Date(ev.startTime).toISOString().split("T")[0] === cell.dateStr;
                    });

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedDate(cell.date)}
                        className={`min-h-[110px] p-2 flex flex-col justify-between transition-colors bg-white dark:bg-[#0B1120] cursor-pointer group ${
                          !cell.isCurrentMonth
                            ? "opacity-35 bg-slate-50/50 dark:bg-[#070A11]/40"
                            : "hover:bg-slate-50/50 dark:hover:bg-slate-800/20"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          {isToday ? (
                            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-extrabold flex items-center justify-center shadow-xs">
                              {cell.dayNum}
                            </span>
                          ) : (
                            <span
                              className={`text-xs font-bold ${
                                cell.isCurrentMonth
                                  ? "text-slate-700 dark:text-slate-300"
                                  : "text-slate-400 dark:text-slate-600"
                              }`}
                            >
                              {cell.dayNum}
                            </span>
                          )}

                          {canManageEvents && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setNewDate(cell.dateStr);
                                setIsAddModalOpen(true);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                              title="Add event"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Events in Month Cell */}
                        <div className="space-y-1 mt-1.5 flex-1">
                          {dayEvents.slice(0, 3).map((ev: any) => {
                            const color = COLOR_CLASSES[ev.colorScheme || "blue"] || COLOR_CLASSES.blue;
                            const isPast = new Date(ev.endTime || ev.startTime).getTime() < Date.now();

                            return (
                              <div
                                key={ev.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEvent(ev);
                                }}
                                className={`px-1.5 py-1 rounded-md border text-[11px] font-semibold truncate cursor-pointer transition-all hover:scale-[1.01] flex items-center gap-1.5 ${color.bg} ${color.border} ${color.text} ${
                                  isPast ? "opacity-60 saturate-75" : ""
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color.dot}`} />
                                <span className="truncate flex-1">{ev.title}</span>
                              </div>
                            );
                          })}

                          {dayEvents.length > 3 && (
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 pl-1">
                              +{dayEvents.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ======================================================== */}
      {/* 4. EVENT DETAILS: Bottom Sheet (Mobile) / Modal (Desktop)  */}
      {/* ======================================================== */}
      {selectedEvent && (() => {
        const isCustomEvent = selectedEvent.id && !String(selectedEvent.id).startsWith("ev_");
        const badge = getBadgeDetails(selectedEvent.eventType);
        const isPast = new Date(selectedEvent.endTime || selectedEvent.startTime).getTime() < Date.now();

        return (
          <div
            className="fixed inset-0 z-50 flex sm:items-center sm:justify-center justify-end flex-col sm:flex-row bg-black/60 animate-fade-in p-0 sm:p-4"
            onClick={() => setSelectedEvent(null)}
          >
            <div
              className="bg-white dark:bg-[#0B1120] w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl p-6 border-t sm:border border-slate-200/90 dark:border-slate-800 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-slide-up sm:animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sheet Handle for Mobile */}
              <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto sm:hidden -mt-2 mb-2" />

              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${badge.cls}`}>
                  {badge.label}
                </span>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Title & Description */}
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {selectedEvent.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                  {selectedEvent.description || "Curriculum milestone & scheduled learning session."}
                </p>
              </div>

              {/* Info Tiles */}
              <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-[#070A11]/60 border border-slate-200/80 dark:border-slate-800/80 space-y-2 text-xs">
                <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                  <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="font-medium">
                    {formatDateStandard(selectedEvent.startTime, true)} –{" "}
                    {new Date(selectedEvent.endTime).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}{" "}
                    ({localTimezone})
                  </span>
                </div>

                {selectedEvent.mentorName && (
                  <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                    <Users className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>
                      Mentor: <strong className="text-slate-900 dark:text-white font-semibold">{selectedEvent.mentorName}</strong>
                    </span>
                  </div>
                )}

                {selectedEvent.courseTitle && (
                  <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                    <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>
                      Course: <strong className="text-slate-900 dark:text-white font-semibold">{selectedEvent.courseTitle}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Calendar Actions: Google Calendar & .ics Download (C4) */}
              <div className="flex items-center gap-2">
                <a
                  href={getGoogleCalendarUrl(selectedEvent)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
                >
                  <CalendarPlus className="w-3.5 h-3.5 text-blue-500" />
                  <span>Google Calendar</span>
                </a>
                <button
                  type="button"
                  onClick={() => handleDownloadIcs(selectedEvent)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Download .ics</span>
                </button>
              </div>

              {/* Primary Actions */}
              <div className="flex items-center justify-between pt-2 gap-2 border-t border-slate-100 dark:border-slate-800">
                {canManageEvents && isCustomEvent ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(selectedEvent.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedEvent(null)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Close
                  </button>

                  {selectedEvent.meetUrl && (
                    <a
                      href={selectedEvent.meetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-xs"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Join Live Video</span>
                    </a>
                  )}

                  {selectedEvent.courseId && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEvent(null);
                        navigate(`/learn/${selectedEvent.courseId}`);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-xs font-bold transition-all hover:opacity-90 shadow-xs cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open in LMS</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add Event Modal for Admins */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0B1120] rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Schedule New Event & Milestone
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deep Learning in Production: PyTorch"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070A11] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Event Type
                  </label>
                  <select
                    value={newEventType}
                    onChange={(e) => setNewEventType(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070A11] text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="LIVE_CLASS">Live Session / Class</option>
                    <option value="MILESTONE">Course Milestone</option>
                    <option value="DEADLINE">Submission Deadline</option>
                    <option value="VIVA_1ON1">1-on-1 Viva / Review</option>
                    <option value="GENERAL">General Meeting</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Audience Scope
                  </label>
                  <select
                    value={newScope}
                    onChange={(e) => setNewScope(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070A11] text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="GLOBAL">Global (All Students)</option>
                    <option value="COURSE">Enrolled Course Cohort</option>
                    <option value="STUDENT">Individual Student (Private)</option>
                  </select>
                </div>
              </div>

              {newScope === "COURSE" && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Course
                  </label>
                  <select
                    value={newCourseId}
                    onChange={(e) => setNewCourseId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070A11] text-slate-900 dark:text-white"
                  >
                    <option value="">Choose Course...</option>
                    {courses.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {newScope === "STUDENT" && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Student
                  </label>
                  <select
                    value={newStudentId}
                    onChange={(e) => setNewStudentId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070A11] text-slate-900 dark:text-white"
                  >
                    <option value="">Choose Student...</option>
                    {students.map((st: any) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070A11] text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070A11] text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070A11] text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Meeting Link (Google Meet / Zoom)
                </label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/..."
                  value={newMeetUrl}
                  onChange={(e) => setNewMeetUrl(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070A11] text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Color Scheme
                </label>
                <div className="flex items-center gap-2">
                  {["blue", "purple", "rose", "green", "amber", "slate"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColorScheme(c)}
                      className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                        c === "blue"
                          ? "bg-sky-500"
                          : c === "purple"
                          ? "bg-purple-500"
                          : c === "rose"
                          ? "bg-rose-500"
                          : c === "green"
                          ? "bg-emerald-500"
                          : c === "amber"
                          ? "bg-amber-500"
                          : "bg-slate-500"
                      } ${newColorScheme === c ? "border-slate-900 dark:border-white scale-110" : "border-transparent"}`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-xs cursor-pointer"
                >
                  {isCreating ? "Scheduling..." : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
