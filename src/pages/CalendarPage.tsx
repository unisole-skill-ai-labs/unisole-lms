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
  Edit,
  Copy,
  AlertTriangle,
  AlertCircle,
  Repeat,
  Bell,
  Globe,
  Check,
} from "lucide-react";
import {
  useGetCalendarEventsQuery,
  useCreateCalendarEventMutation,
  useUpdateCalendarEventMutation,
  useDeleteCalendarEventMutation,
  useGetAdminCoursesQuery,
  useGetAdminStudentsQuery,
} from "../store/apiSlice";
import { generateIcsCalendar, formatDateStandard } from "../utils/courseFlow";

const TIMEZONE_IANA = "Asia/Kolkata";
const TIMEZONE_LABEL = "IST (Asia/Kolkata)";

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
  const isMentor = !isAdmin && !isCourseManager && userRoles.includes("MENTOR");
  const canManageEvents = isAdmin || isCourseManager || isMentor;

  // View States: Mobile defaults to "agenda", Desktop defaults to "week"
  const [viewMode, setViewMode] = useState<"agenda" | "week" | "month">(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) return "agenda";
    return "week";
  });

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [search, setSearch] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // C1: Filters
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("ALL");
  const [courseFilter, setCourseFilter] = useState<string>("ALL");
  const [mentorFilter, setMentorFilter] = useState<string>("ALL");
  const [cohortFilter, setCohortFilter] = useState<string>("ALL");

  // Modals & Panels
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  // C4: Drag to Reschedule Confirmation Dialog
  const [draggedEvent, setDraggedEvent] = useState<any | null>(null);
  const [rescheduleConfirmData, setRescheduleConfirmData] = useState<{
    event: any;
    newStartTime: string;
    newEndTime: string;
    notifyStudents: boolean;
  } | null>(null);
  const [dragHoverSlot, setDragHoverSlot] = useState<{ dayStr: string; slotHour: number } | null>(null);

  // Destructive Cancel Modal
  const [cancelConfirmEvent, setCancelConfirmEvent] = useState<any | null>(null);

  // Form State for creating / editing event (C5)
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formEventType, setFormEventType] = useState<string>("LIVE_CLASS");
  const [formDate, setFormDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [formStartTime, setFormStartTime] = useState("10:00");
  const [formEndTime, setFormEndTime] = useState("11:30");
  const [formScope, setFormScope] = useState("COURSE");
  const [formCourseId, setFormCourseId] = useState("cs-agentic");
  const [formMentorName, setFormMentorName] = useState("");
  const [formStudentName, setFormStudentName] = useState("");
  const [formMeetUrl, setFormMeetUrl] = useState("");
  const [formColorScheme, setFormColorScheme] = useState("blue");
  const [formRecurrence, setFormRecurrence] = useState<"NONE" | "WEEKLY">("NONE");
  const [formRecurrenceEndDate, setFormRecurrenceEndDate] = useState("");
  const [formNotifyStudents, setFormNotifyStudents] = useState(true);
  const [formError, setFormError] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // RTK Query: Dynamic calendar events from DB
  const { data: rawEvents = [], isLoading, isError, refetch } = useGetCalendarEventsQuery({});
  const [createCalendarEventApi, { isLoading: isCreating }] = useCreateCalendarEventMutation();
  const [updateCalendarEventApi, { isLoading: isUpdating }] = useUpdateCalendarEventMutation();
  const [deleteCalendarEventApi, { isLoading: isDeleting }] = useDeleteCalendarEventMutation();

  const { data: courses = [] } = useGetAdminCoursesQuery(undefined, {
    skip: !canManageEvents,
  });
  const { data: students = [] } = useGetAdminStudentsQuery(undefined, {
    skip: !canManageEvents,
  });

  // Render only real events from the API; empty on empty response or API error
  const effectiveRawEvents = useMemo(
    () => (!isError && Array.isArray(rawEvents) ? rawEvents : []),
    [rawEvents, isError]
  );

  // Available Mentors & Cohorts for Filter Dropdowns (C1)
  const availableMentors = useMemo(() => {
    const mentorsSet = new Set<string>();
    effectiveRawEvents.forEach((e: any) => {
      if (e.mentorName) mentorsSet.add(e.mentorName);
    });
    return Array.from(mentorsSet);
  }, [effectiveRawEvents]);

  const availableCohorts = useMemo(() => {
    const cohortsSet = new Set<string>();
    effectiveRawEvents.forEach((e: any) => {
      if (e.cohort) cohortsSet.add(e.cohort);
    });
    cohortsSet.add("November 2026 Batch");
    cohortsSet.add("December 2026 Batch");
    return Array.from(cohortsSet);
  }, [effectiveRawEvents]);

  // Role-based scoping + Filter Application (C1 & E4)
  const events = useMemo(() => {
    let list = Array.isArray(effectiveRawEvents) ? [...effectiveRawEvents] : [];

    // Role-based Scoping: Mentors see only their own mentees and events (plus global live classes)
    if (isMentor && user?.id) {
      list = list.filter(
        (e: any) =>
          e.mentorId === user.id ||
          e.mentorName === user.name ||
          e.scope === "GLOBAL" ||
          e.eventType === "LIVE_CLASS"
      );
    }

    // Filter by Event Type
    if (eventTypeFilter !== "ALL") {
      list = list.filter((e: any) => {
        if (eventTypeFilter === "LIVE_CLASS") return e.eventType === "LIVE_CLASS";
        if (eventTypeFilter === "MILESTONE") return e.eventType === "MILESTONE";
        if (eventTypeFilter === "DEADLINE") return e.eventType === "DEADLINE";
        if (eventTypeFilter === "VIVA_1ON1") return e.eventType === "VIVA_1ON1";
        return e.eventType === eventTypeFilter;
      });
    }

    // Filter by Course
    if (courseFilter !== "ALL") {
      list = list.filter(
        (e: any) => e.courseId === courseFilter || e.courseTitle?.toLowerCase().includes(courseFilter.toLowerCase())
      );
    }

    // Filter by Mentor
    if (mentorFilter !== "ALL") {
      list = list.filter((e: any) => e.mentorName === mentorFilter);
    }

    // Filter by Cohort
    if (cohortFilter !== "ALL") {
      list = list.filter((e: any) => (e.cohort || "November 2026 Batch") === cohortFilter);
    }

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e: any) =>
          (e.title && String(e.title).toLowerCase().includes(q)) ||
          (e.description && String(e.description).toLowerCase().includes(q)) ||
          (e.mentorName && String(e.mentorName).toLowerCase().includes(q)) ||
          (e.courseTitle && String(e.courseTitle).toLowerCase().includes(q)) ||
          (e.studentName && String(e.studentName).toLowerCase().includes(q))
      );
    }

    return list;
  }, [effectiveRawEvents, search, eventTypeFilter, courseFilter, mentorFilter, cohortFilter, isMentor, user]);

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
    return currentDate.toLocaleString("default", { month: "long", year: "numeric", timeZone: TIMEZONE_IANA });
  }, [currentDate]);

  const formattedDateRange = useMemo(() => {
    if (viewMode === "week" || viewMode === "agenda") {
      const first = weekDays[0];
      const last = weekDays[6];
      return `${first.toLocaleDateString("default", { month: "short", day: "numeric", timeZone: TIMEZONE_IANA })} – ${last.toLocaleDateString("default", { month: "short", day: "numeric", year: "numeric", timeZone: TIMEZONE_IANA })}`;
    }
    return `${currentDate.toLocaleString("default", { month: "long", timeZone: TIMEZONE_IANA })} ${currentDate.getFullYear()}`;
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

  // Auto-scroll to current hour on desktop weekly grid load (C7)
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

  // Real-time red indicator line calculation (C7)
  const isCurrentTimeInRange = currentHour >= START_HOUR && currentHour <= 20;
  const currentTimeTopPx = isCurrentTimeInRange
    ? (currentHour - START_HOUR + currentMinute / 60) * SLOT_HEIGHT_PX
    : null;

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

  // Calendar Export Handlers
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
    showToast("Downloaded .ics event");
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

  // Open Edit Form Modal (C5)
  const openEditEventModal = (ev: any) => {
    setEditingEvent(ev);
    setFormTitle(ev.title || "");
    setFormDescription(ev.description || "");
    setFormEventType(ev.eventType || "LIVE_CLASS");
    const d = new Date(ev.startTime);
    setFormDate(d.toISOString().split("T")[0]);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    setFormStartTime(`${hh}:${mm}`);

    const endD = new Date(ev.endTime || ev.startTime);
    const endHh = String(endD.getHours()).padStart(2, "0");
    const endMm = String(endD.getMinutes()).padStart(2, "0");
    setFormEndTime(`${endHh}:${endMm}`);

    setFormScope(ev.scope || "COURSE");
    setFormCourseId(ev.courseId || "cs-agentic");
    setFormMentorName(ev.mentorName || "");
    setFormStudentName(ev.studentName || "");
    setFormMeetUrl(ev.meetUrl || "");
    setFormColorScheme(ev.colorScheme || "blue");
    setFormRecurrence("NONE");
    setFormNotifyStudents(true);
    setFormError("");
    setIsAddModalOpen(true);
    setSelectedEvent(null);
  };

  // Open Add Form Modal (C5)
  const openAddEventModal = (defaultDateStr?: string, defaultHour?: number) => {
    setEditingEvent(null);
    setFormTitle("");
    setFormDescription("");
    setFormEventType("LIVE_CLASS");
    setFormDate(defaultDateStr || selectedDateStr);
    const startH = defaultHour !== undefined ? defaultHour : 10;
    const hh = String(startH).padStart(2, "0");
    setFormStartTime(`${hh}:00`);
    const endH = String(startH + 1).padStart(2, "0");
    setFormEndTime(`${endH}:00`);
    setFormScope("COURSE");
    setFormCourseId("cs-agentic");
    setFormMentorName("");
    setFormStudentName("");
    setFormMeetUrl("");
    setFormColorScheme("blue");
    setFormRecurrence("NONE");
    setFormRecurrenceEndDate("");
    setFormNotifyStudents(true);
    setFormError("");
    setIsAddModalOpen(true);
  };

  // Mentor Overlap Check (C5)
  const mentorOverlapWarning = useMemo(() => {
    if (!formMentorName || !formDate || !formStartTime || !formEndTime) return null;
    const startMins = parseInt(formStartTime.split(":")[0]) * 60 + parseInt(formStartTime.split(":")[1]);
    const endMins = parseInt(formEndTime.split(":")[0]) * 60 + parseInt(formEndTime.split(":")[1]);

    const overlapping = (events || []).find((ev: any) => {
      if (editingEvent && ev.id === editingEvent.id) return false;
      if (ev.mentorName !== formMentorName) return false;
      const evDate = new Date(ev.startTime).toISOString().split("T")[0];
      if (evDate !== formDate) return false;

      const evStart = new Date(ev.startTime);
      const evEnd = new Date(ev.endTime || ev.startTime);
      const evStartMins = evStart.getHours() * 60 + evStart.getMinutes();
      const evEndMins = evEnd.getHours() * 60 + evEnd.getMinutes();

      // Check collision
      return startMins < evEndMins && endMins > evStartMins;
    });

    if (overlapping) {
      return `Mentor ${formMentorName} already has an event scheduled at this time ("${overlapping.title}").`;
    }
    return null;
  }, [formMentorName, formDate, formStartTime, formEndTime, events, editingEvent]);

  // Handle Form Submit (Add or Edit Event) (C5)
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError("Event title is required.");
      return;
    }

    // Validate end time > start time
    const startMinutes = parseInt(formStartTime.split(":")[0]) * 60 + parseInt(formStartTime.split(":")[1]);
    const endMinutes = parseInt(formEndTime.split(":")[0]) * 60 + parseInt(formEndTime.split(":")[1]);
    if (endMinutes <= startMinutes) {
      setFormError("End time must be later than start time.");
      return;
    }

    const startIso = new Date(`${formDate}T${formStartTime}:00`).toISOString();
    const endIso = new Date(`${formDate}T${formEndTime}:00`).toISOString();

    setFormError("");

    try {
      if (editingEvent) {
        await updateCalendarEventApi({
          id: editingEvent.id,
          body: {
            title: formTitle.trim(),
            description: formDescription.trim(),
            eventType: formEventType,
            startTime: startIso,
            endTime: endIso,
            scope: formScope,
            courseId: formScope === "COURSE" ? formCourseId : null,
            studentId: formScope === "STUDENT" ? formStudentName : null,
            mentorName: formMentorName,
            meetUrl: formMeetUrl.trim() || null,
            colorScheme: formColorScheme,
            notifyStudents: formNotifyStudents,
          },
        }).unwrap();
        showToast(`Event "${formTitle}" updated successfully.`);
      } else {
        await createCalendarEventApi({
          title: formTitle.trim(),
          description: formDescription.trim(),
          eventType: formEventType,
          startTime: startIso,
          endTime: endIso,
          scope: formScope,
          courseId: formScope === "COURSE" ? formCourseId : null,
          studentId: formScope === "STUDENT" ? formStudentName : null,
          mentorName: formMentorName,
          meetUrl: formMeetUrl.trim() || null,
          colorScheme: formColorScheme,
          notifyStudents: formNotifyStudents,
        }).unwrap();
        showToast(`Event "${formTitle}" scheduled successfully.`);
      }

      setIsAddModalOpen(false);
      refetch();
    } catch (err: any) {
      setFormError(err?.data?.error || "Failed to save event. Please check required fields.");
    }
  };

  // Drag and Drop Handlers for Rescheduling (C4)
  const handleDragStart = (e: React.DragEvent, ev: any) => {
    if (!canManageEvents) return;
    setDraggedEvent(ev);
    e.dataTransfer.setData("text/plain", ev.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleSlotDragOver = (e: React.DragEvent, dayDateStr: string, slotHour: number) => {
    if (!canManageEvents || !draggedEvent) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragHoverSlot?.dayStr !== dayDateStr || dragHoverSlot?.slotHour !== slotHour) {
      setDragHoverSlot({ dayStr: dayDateStr, slotHour });
    }
  };

  const handleSlotDrop = (e: React.DragEvent, dayDate: Date, slotHour: number) => {
    e.preventDefault();
    setDragHoverSlot(null);
    if (!draggedEvent || !canManageEvents) return;

    // Calculate original duration
    const origStart = new Date(draggedEvent.startTime);
    const origEnd = new Date(draggedEvent.endTime || draggedEvent.startTime);
    const durationMs = Math.max(30 * 60000, origEnd.getTime() - origStart.getTime());

    // New start time
    const newStart = new Date(dayDate);
    newStart.setHours(slotHour, origStart.getMinutes(), 0, 0);
    const newEnd = new Date(newStart.getTime() + durationMs);

    // Open confirmation dialog with old and new times
    setRescheduleConfirmData({
      event: draggedEvent,
      newStartTime: newStart.toISOString(),
      newEndTime: newEnd.toISOString(),
      notifyStudents: true,
    });
    setDraggedEvent(null);
  };

  // Confirm Reschedule Execution (C4)
  const handleConfirmReschedule = async () => {
    if (!rescheduleConfirmData) return;
    const { event, newStartTime, newEndTime, notifyStudents } = rescheduleConfirmData;

    try {
      await updateCalendarEventApi({
        id: event.id,
        body: {
          startTime: newStartTime,
          endTime: newEndTime,
          notifyStudents,
        },
      }).unwrap();
      showToast(`Rescheduled "${event.title}" to new slot.`);
      refetch();
    } catch (err: any) {
      showToast(err?.data?.error || "Failed to reschedule event.");
    } finally {
      setRescheduleConfirmData(null);
    }
  };

  // Cancel / Delete Event Execution
  const handleConfirmCancelEvent = async () => {
    if (!cancelConfirmEvent) return;
    try {
      await deleteCalendarEventApi(cancelConfirmEvent.id).unwrap();
      showToast(`Event "${cancelConfirmEvent.title}" has been cancelled.`);
      setSelectedEvent(null);
      refetch();
    } catch (err: any) {
      showToast(err?.data?.error || "Failed to cancel event.");
    } finally {
      setCancelConfirmEvent(null);
    }
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 pb-28 sm:pb-12 max-w-[1600px] mx-auto space-y-4 sm:space-y-5 font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white text-xs font-semibold rounded-2xl shadow-xl border border-slate-700 ">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 mb-0.5">
            <span>Studio Cockpit</span>
            <span>/</span>
            <span className="text-slate-600 dark:text-slate-300">Live Schedule</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <CalendarIcon className="w-6 h-6 text-sky-500" />
            <span>Master Academic Calendar</span>
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-400">
              Track live classes, quizzes, deadlines, and mentor 1-on-1s.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Search Icon Toggle */}
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
              className="pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 w-56"
            />
          </div>

          {/* Add Event Button for Managers & Mentors (C5) */}
          {canManageEvents && (
            <button
              type="button"
              onClick={() => openAddEventModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
              title="Schedule new live event"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Event</span>
            </button>
          )}
        </div>
      </div>

      {/* C1: Filters Row (Type chips + Course, Mentor, Cohort dropdowns) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 bg-white dark:bg-[#0B1120] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs">
        {/* Type Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
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
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs"
                    : "bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? "" : f.color}`} />
                <span>{f.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dropdown Filters: Course, Mentor, Cohort (C1) */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Course Dropdown */}
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-[#070A11] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
          >
            <option value="ALL">All Courses</option>
            <option value="cs-agentic">AI Agent Engineering</option>
            {courses
              .filter((c: any) => c.slug !== "cs-agentic")
              .map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
          </select>

          {/* Mentor Dropdown */}
          <select
            value={mentorFilter}
            onChange={(e) => setMentorFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-[#070A11] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
          >
            <option value="ALL">All Mentors</option>
            {availableMentors.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          {/* Cohort Dropdown */}
          <select
            value={cohortFilter}
            onChange={(e) => setCohortFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-[#070A11] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
          >
            <option value="ALL">All Cohorts</option>
            {availableCohorts.map((co) => (
              <option key={co} value={co}>
                {co}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Date Navigation & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Date Month Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex flex-col items-center justify-center text-center shrink-0">
            <span className="text-[9px] font-extrabold uppercase text-slate-400 leading-none">
              {currentDate.toLocaleString("default", { month: "short", timeZone: TIMEZONE_IANA })}
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

        {/* View mode switcher & Navigation Controls (C2) */}
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

          {/* View Switcher: Agenda, Week, Month (C2) */}
          <div className="flex items-center bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800 rounded-xl p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("agenda")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === "agenda"
                  ? "bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Agenda
            </button>
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === "week"
                  ? "bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === "month"
                  ? "bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Month
            </button>
          </div>
        </div>
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
          {effectiveRawEvents.length === 0 && (
            <div className="mb-4 p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center bg-white dark:bg-[#0B1120] space-y-1.5">
              <CalendarIcon className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                No events scheduled
              </p>
            </div>
          )}
          {/* ======================================================== */}
          {/* 1. AGENDA VIEW (Mobile-First Default & Accessible List)   */}
          {/* ======================================================== */}
          {viewMode === "agenda" && (
            <div className="space-y-4">
              {/* Horizontal Day Strip (Mon-Sun, today highlighted, dots for events) */}
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
                            ? "bg-sky-500 text-slate-950 shadow-xs font-bold"
                            : isToday
                            ? "bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 font-bold border border-sky-200/70 dark:border-sky-900/60"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <span className={`text-[10px] uppercase font-bold tracking-tight ${isSelected ? "text-slate-950" : ""}`}>
                          {date.toLocaleDateString("default", { weekday: "narrow", timeZone: TIMEZONE_IANA })}
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
                                className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-slate-950" : badge.dot}`}
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
                        timeZone: TIMEZONE_IANA,
                      })}
                    </span>
                    {selectedDateStr === now.toISOString().split("T")[0] && (
                      <span className="text-[10px] uppercase font-bold bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded-full border border-sky-200/60 dark:border-sky-800/60">
                        Today
                      </span>
                    )}
                  </h3>
                </div>

                <span className="text-xs font-bold text-slate-400">
                  {selectedDateEvents.length} event{selectedDateEvents.length === 1 ? "" : "s"}
                </span>
              </div>

              {/* Event Cards Feed */}
              {selectedDateEvents.length > 0 ? (
                <div className="space-y-3">
                  {selectedDateEvents.map((ev: any) => {
                    const badge = getBadgeDetails(ev.eventType);
                    const isPast = new Date(ev.endTime || ev.startTime).getTime() < Date.now();
                    const startTimeStr = new Date(ev.startTime).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: TIMEZONE_IANA,
                    });
                    const endTimeStr = new Date(ev.endTime || ev.startTime).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: TIMEZONE_IANA,
                    });

                    return (
                      <div
                        key={ev.id}
                        onClick={() => setSelectedEvent(ev)}
                        className={`w-full p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0B1120] shadow-2xs space-y-3 cursor-pointer transition-all hover:border-sky-300 dark:hover:border-sky-700 active:scale-[0.99] ${
                          isPast ? "opacity-60 saturate-75 bg-slate-50/50" : ""
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
                              {startTimeStr} – {endTimeStr} ({TIMEZONE_LABEL})
                            </span>
                            {isPast && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 font-bold ml-1">
                                Past
                              </span>
                            )}
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
                              <BookOpen className="w-3.5 h-3.5 text-sky-500 shrink-0" />
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
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-bold transition-all shadow-xs"
                              >
                                <Video className="w-3.5 h-3.5" />
                                <span>Join Classroom</span>
                              </a>
                            )}

                            {ev.courseId && !ev.meetUrl && (
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
                            className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 py-1"
                          >
                            Details & Actions →
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
                      onClick={() => openAddEventModal(selectedDateStr)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-bold transition-all shadow-xs cursor-pointer mt-2"
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
          {/* 2. DESKTOP WEEKLY GRID (C4: Drag to Reschedule + Grid)   */}
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

                      const dayName = date.toLocaleDateString("default", { weekday: "short", timeZone: TIMEZONE_IANA });
                      const dayNum = date.getDate();

                      return (
                        <div
                          key={idx}
                          className={`p-3 text-xs font-semibold border-r border-slate-100 dark:border-slate-800/80 last:border-r-0 flex items-center justify-center gap-1.5 ${
                            isToday
                              ? "bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 font-bold"
                              : "text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          <span className={isToday ? "text-sky-600 dark:text-sky-400 font-extrabold uppercase text-[10px]" : "text-slate-400"}>
                            {isToday ? "Today" : dayName}
                          </span>
                          {isToday ? (
                            <span className="w-6 h-6 rounded-full bg-sky-500 text-slate-950 text-xs font-black flex items-center justify-center shadow-xs">
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
                    {/* Current Time Red Indicator Line (C7) */}
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
                              isTodayCol ? "bg-sky-50/[0.15] dark:bg-sky-950/15" : ""
                            }`}
                          >
                            {HOURS.map((_, slotIdx) => {
                              const slotHour = slotIdx + START_HOUR;
                              const isSlotHovered =
                                dragHoverSlot?.dayStr === dayDateStr &&
                                dragHoverSlot?.slotHour === slotHour;

                              return (
                                <div
                                  key={slotIdx}
                                  onDragOver={(e) => handleSlotDragOver(e, dayDateStr, slotHour)}
                                  onDrop={(e) => handleSlotDrop(e, dayDate, slotHour)}
                                  onClick={() => {
                                    if (canManageEvents) {
                                      openAddEventModal(dayDateStr, slotHour);
                                    }
                                  }}
                                  className={`h-[48px] transition-colors cursor-pointer ${
                                    isSlotHovered
                                      ? "bg-sky-500/20 border-2 border-dashed border-sky-400"
                                      : "hover:bg-slate-50/40 dark:hover:bg-slate-800/20"
                                  }`}
                                />
                              );
                            })}

                            {/* Placed Event Cards (C4: Draggable + Tooltips) */}
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

                              const timeDisplay = `${startDate.toLocaleTimeString([], {
                                hour: "numeric",
                                minute: "2-digit",
                                timeZone: TIMEZONE_IANA,
                              })} – ${endDate.toLocaleTimeString([], {
                                hour: "numeric",
                                minute: "2-digit",
                                timeZone: TIMEZONE_IANA,
                              })}`;

                              return (
                                <div
                                  key={ev.id}
                                  draggable={canManageEvents}
                                  onDragStart={(e) => handleDragStart(e, ev)}
                                  onClick={() => setSelectedEvent(ev)}
                                  title={`${ev.title}\nTime: ${timeDisplay} (${TIMEZONE_LABEL})\nType: ${ev.eventType}`}
                                  style={{
                                    top: `${topOffset}px`,
                                    height: `${height}px`,
                                  }}
                                  className={`absolute left-1 right-1 rounded-xl p-2 border transition-all hover:scale-[1.01] hover:shadow-md z-10 flex flex-col justify-between cursor-pointer overflow-hidden shadow-2xs group ${
                                    color.bg
                                  } ${color.border} ${color.text} ${
                                    isPast ? "opacity-60 saturate-75" : ""
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-1">
                                    <h4 className="text-[11px] font-bold truncate leading-tight group-hover:text-sky-600 dark:group-hover:text-sky-300">
                                      {ev.title}
                                    </h4>
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color.dot}`} />
                                  </div>

                                  <div className="flex items-center justify-between text-[10px] font-mono opacity-80 mt-0.5">
                                    <span className="truncate">{timeDisplay}</span>
                                    {isPast && (
                                      <span className="text-[9px] px-1 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-500 font-bold shrink-0">
                                        Past
                                      </span>
                                    )}
                                  </div>
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
          {/* 3. MONTH VIEW (Mobile Matrix + Desktop Grid)              */}
          {/* ======================================================== */}
          {viewMode === "month" && (
            <div className="space-y-4">
              {/* Desktop Month Matrix */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0B1120] overflow-hidden shadow-2xs">
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
                            <span className="w-6 h-6 rounded-full bg-sky-500 text-slate-950 text-xs font-extrabold flex items-center justify-center shadow-xs">
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

                          {dayEvents.length > 0 && (
                            <span className="text-[10px] font-mono text-slate-400">
                              {dayEvents.length}
                            </span>
                          )}
                        </div>

                        {/* Event Pills inside Month Cell */}
                        <div className="space-y-1 mt-1.5 overflow-hidden">
                          {dayEvents.slice(0, 3).map((ev: any) => {
                            const badge = getBadgeDetails(ev.eventType);
                            return (
                              <div
                                key={ev.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEvent(ev);
                                }}
                                title={`${ev.title} (${new Date(ev.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone: TIMEZONE_IANA })})`}
                                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md truncate border flex items-center gap-1 ${badge.cls}`}
                              >
                                <span className={`w-1 h-1 rounded-full shrink-0 ${badge.dot}`} />
                                <span className="truncate">{ev.title}</span>
                              </div>
                            );
                          })}
                          {dayEvents.length > 3 && (
                            <span className="text-[9px] font-bold text-slate-400 block pl-1">
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
      {/* C3: EVENT DETAILS SIDE PANEL (DESKTOP) & BOTTOM SHEET (MOBILE) */}
      {/* ======================================================== */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            onClick={() => setSelectedEvent(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity "
          />

          {/* Responsive Panel Container: Desktop Slide-over right, Mobile Bottom Sheet */}
          <div
            className={`fixed bg-white dark:bg-[#0B1120] shadow-2xl z-50 flex flex-col justify-between transition-all ${
              isMobile
                ? "inset-x-0 bottom-0 rounded-t-3xl max-h-[85vh] p-6 border-t border-slate-200 dark:border-slate-800 "
                : "top-0 right-0 bottom-0 w-[440px] p-6 border-l border-slate-200 dark:border-slate-800 overflow-y-auto"
            }`}
          >
            <div className="space-y-5 overflow-y-auto pr-1">
              {/* Header with Type Badge & Close */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span
                  className={`text-[11px] font-extrabold uppercase px-3 py-1 rounded-full border ${
                    getBadgeDetails(selectedEvent.eventType).cls
                  }`}
                >
                  {getBadgeDetails(selectedEvent.eventType).label}
                </span>

                <button
                  onClick={() => setSelectedEvent(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Title & Description (Full, No Truncation) (C3) */}
              <div className="space-y-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                  {selectedEvent.title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                  {selectedEvent.description || "Curriculum milestone & scheduled learning session."}
                </p>
              </div>

              {/* Date & Time Info Card with Timezone (C3 & C6) */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070A11] border border-slate-200/80 dark:border-slate-800/80 space-y-2.5 text-xs">
                <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                  <Clock className="w-4 h-4 text-sky-500 shrink-0" />
                  <span className="font-semibold">
                    {formatDateStandard(selectedEvent.startTime, true)} ·{" "}
                    {new Date(selectedEvent.startTime).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: TIMEZONE_IANA,
                    })}{" "}
                    –{" "}
                    {new Date(selectedEvent.endTime || selectedEvent.startTime).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: TIMEZONE_IANA,
                    })}
                  </span>
                </div>

                {selectedEvent.courseTitle && (
                  <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                    <BookOpen className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>
                      Course:{" "}
                      <strong className="text-slate-900 dark:text-white font-semibold">
                        {selectedEvent.courseTitle}
                      </strong>
                    </span>
                  </div>
                )}

                {selectedEvent.mentorName && (
                  <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                    <Users className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>
                      Mentor:{" "}
                      <strong className="text-slate-900 dark:text-white font-semibold">
                        {selectedEvent.mentorName}
                      </strong>
                    </span>
                  </div>
                )}

                {/* Mentorship Student Name & Status (C3) */}
                {selectedEvent.studentName && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-800/60">
                    <span className="text-slate-500">Learner:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {selectedEvent.studentName}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {selectedEvent.status || "Scheduled"}
                    </span>
                  </div>
                )}
              </div>

              {/* Join Link & Copy Button (C3) */}
              {selectedEvent.meetUrl && (
                <div className="p-3.5 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-sky-900 dark:text-sky-200">
                    <span className="flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-sky-500" />
                      <span>Live Classroom Link</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedEvent.meetUrl);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
                    </button>
                  </div>
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                    {selectedEvent.meetUrl}
                  </p>
                </div>
              )}

              {/* Calendar Sync Links (.ics & Google Calendar) */}
              <div className="flex items-center gap-2">
                <a
                  href={getGoogleCalendarUrl(selectedEvent)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
                >
                  <CalendarPlus className="w-3.5 h-3.5 text-sky-500" />
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
            </div>

            {/* Bottom Actions Row (Edit, Reschedule, Cancel, Join) (C3) */}
            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2">
                {selectedEvent.meetUrl && (
                  <a
                    href={selectedEvent.meetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-bold transition-all shadow-xs"
                  >
                    <Video className="w-4 h-4" />
                    <span>Join Live Video</span>
                  </a>
                )}

                {selectedEvent.courseId && !selectedEvent.meetUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEvent(null);
                      navigate(`/learn/${selectedEvent.courseId}`);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-950 text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open in LMS</span>
                  </button>
                )}
              </div>

              {/* Manager Actions: Edit, Reschedule, Cancel */}
              {canManageEvents && (
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditEventModal(selectedEvent)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5 text-sky-500" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const curStart = new Date(selectedEvent.startTime);
                        const curEnd = new Date(selectedEvent.endTime || selectedEvent.startTime);
                        // Suggest next day same time
                        const newS = new Date(curStart);
                        newS.setDate(newS.getDate() + 1);
                        const newE = new Date(curEnd);
                        newE.setDate(newE.getDate() + 1);
                        setRescheduleConfirmData({
                          event: selectedEvent,
                          newStartTime: newS.toISOString(),
                          newEndTime: newE.toISOString(),
                          notifyStudents: true,
                        });
                        setSelectedEvent(null);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5 text-purple-500" />
                      <span>Reschedule</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCancelConfirmEvent(selectedEvent);
                      setSelectedEvent(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Cancel Event</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* C4: DRAG-TO-RESCHEDULE CONFIRMATION DIALOG               */}
      {/* ======================================================== */}
      {rescheduleConfirmData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0B1120] rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 ">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Reschedule Event
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {rescheduleConfirmData.event.title}
                </p>
              </div>
            </div>

            {/* Old vs New Time Display */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070A11] border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>Previous Slot:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {formatDateStandard(rescheduleConfirmData.event.startTime, true)} (
                  {new Date(rescheduleConfirmData.event.startTime).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: TIMEZONE_IANA,
                  })}
                  )
                </span>
              </div>

              <div className="flex items-center justify-between text-sky-600 dark:text-sky-400 font-bold">
                <span>New Rescheduled Slot:</span>
                <span className="font-mono">
                  {formatDateStandard(rescheduleConfirmData.newStartTime, true)} (
                  {new Date(rescheduleConfirmData.newStartTime).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: TIMEZONE_IANA,
                  })}
                  )
                </span>
              </div>
            </div>

            {/* Notify Students Toggle (C4) */}
            <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={rescheduleConfirmData.notifyStudents}
                onChange={(e) =>
                  setRescheduleConfirmData({
                    ...rescheduleConfirmData,
                    notifyStudents: e.target.checked,
                  })
                }
                className="rounded text-sky-500 focus:ring-sky-400 w-4 h-4"
              />
              <span className="flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-sky-500" />
                <span>Notify enrolled learners of this schedule change</span>
              </span>
            </label>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRescheduleConfirmData(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleConfirmReschedule}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                {isUpdating ? "Rescheduling..." : "Confirm Reschedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CANCEL EVENT CONFIRMATION DIALOG (DESTRUCTIVE ACTION)     */}
      {/* ======================================================== */}
      {cancelConfirmEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0B1120] rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 ">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Cancel Scheduled Event
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {cancelConfirmEvent.title}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to cancel and remove this event? Learners and mentors will no longer see it on their calendar schedule.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCancelConfirmEvent(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Keep Event
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmCancelEvent}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                {isDeleting ? "Cancelling..." : "Confirm Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* C5: ADD / EDIT EVENT FORM MODAL                          */}
      {/* ======================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0B1120] rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-sky-500" />
                <span>{editingEvent ? "Edit Scheduled Event" : "Schedule New Academic Event"}</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-medium border border-rose-200 dark:border-rose-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Mentor Overlap Warning (C5) */}
            {mentorOverlapWarning && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-medium border border-amber-200 dark:border-amber-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                <span>{mentorOverlapWarning}</span>
              </div>
            )}

            <form onSubmit={handleSaveEvent} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deep Learning in Production: PyTorch"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070A11] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Event Type
                  </label>
                  <select
                    value={formEventType}
                    onChange={(e) => setFormEventType(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070A11] text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="LIVE_CLASS">Live Session / Class</option>
                    <option value="MILESTONE">Course Milestone / Quiz</option>
                    <option value="DEADLINE">Submission Deadline</option>
                    <option value="VIVA_1ON1">1-on-1 Mentorship / Viva</option>
                    <option value="GENERAL">General Workshop</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Course Outline
                  </label>
                  <select
                    value={formCourseId}
                    onChange={(e) => setFormCourseId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070A11] text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="cs-agentic">AI Agent Engineering</option>
                    {courses
                      .filter((c: any) => c.slug !== "cs-agentic")
                      .map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Mentor Selection */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Mentor / Lead Instructor
                </label>
                <select
                  value={formMentorName}
                  onChange={(e) => setFormMentorName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070A11] text-slate-900 dark:text-white"
                >
                  {availableMentors.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date, Start Time & End Time */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070A11] text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070A11] text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070A11] text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Join Link */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Meeting / Video Join URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/xyz-abc-123"
                  value={formMeetUrl}
                  onChange={(e) => setFormMeetUrl(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070A11] text-slate-900 dark:text-white font-mono text-[11px]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description & Preparation Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Topics covered, prerequisite readings, or lab deliverables..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070A11] text-slate-900 dark:text-white"
                />
              </div>

              {/* Recurrence & Notify Students */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070A11] border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <Repeat className="w-3.5 h-3.5 text-sky-500" />
                    <span>Recurrence:</span>
                  </label>
                  <select
                    value={formRecurrence}
                    onChange={(e: any) => setFormRecurrence(e.target.value)}
                    className="p-1 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120]"
                  >
                    <option value="NONE">Does not repeat</option>
                    <option value="WEEKLY">Repeats weekly</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={formNotifyStudents}
                    onChange={(e) => setFormNotifyStudents(e.target.checked)}
                    className="rounded text-sky-500 focus:ring-sky-400"
                  />
                  <span className="flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-sky-500" />
                    <span>Notify enrolled learners of this event</span>
                  </span>
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="px-4 py-2 font-bold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isCreating || isUpdating
                    ? "Saving..."
                    : editingEvent
                    ? "Update Event"
                    : "Schedule Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
