import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Calendar, CheckCircle2, Clock, FileQuestion, FileText, Video } from "lucide-react";
import { useGetStudentActivitiesQuery } from "../store/apiSlice";
import { cleanLessonTitle } from "../utils/formatContent";

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { data: activitiesData, isLoading } = useGetStudentActivitiesQuery(undefined);

  const missedList = activitiesData?.missed || [];
  const upcomingList = activitiesData?.upcoming || [];
  const todayUpcoming = upcomingList.filter((u: any) => u.isToday || u.isUrgent);

  const notifications = [
    ...todayUpcoming.map((item: any) => ({
      id: `notif-${item.id}`,
      type: "upcoming" as const,
      title: cleanLessonTitle(item.title),
      subtitle: `${item.category} · ${item.moduleTitle || "Current Week"}`,
      time: item.dateText,
      link: `/learn/${item.pathwayId || activitiesData?.pathwayId}?lesson=${item.lessonId}`,
      meetUrl: item.meetUrl,
      icon: item.type === "live" ? Video : item.type === "quiz" ? FileQuestion : FileText,
      badge: item.isToday ? "Today" : "Urgent",
      badgeColor: "amber",
    })),
    ...missedList.map((item: any) => ({
      id: `notif-${item.id}`,
      type: "missed" as const,
      title: cleanLessonTitle(item.title),
      subtitle: `${item.category} · ${item.moduleTitle || "Previous Week"}`,
      time: item.dateText,
      link: `/learn/${item.pathwayId || activitiesData?.pathwayId}?lesson=${item.lessonId}`,
      meetUrl: undefined,
      icon: item.type === "quiz" ? FileQuestion : FileText,
      badge: "Overdue",
      badgeColor: "rose",
    })),
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/70 dark:bg-[#0B0D13] py-4 sm:py-8 transition-colors">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-4">
        {/* Top Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            aria-label="Back to Dashboard"
            className="p-2 -ml-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2]" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Notifications
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Stay updated on deadlines, live workshops & milestones
            </p>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-800 animate-pulse flex items-center gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3" />
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white dark:bg-[#121622] rounded-3xl border border-zinc-200/80 dark:border-zinc-800 p-8 text-center space-y-3 mt-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-2xs border border-blue-100 dark:border-blue-900/40">
              <CheckCircle2 className="w-6 h-6 stroke-[1.8]" />
            </div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              You're all caught up!
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
              No new notifications right now. Check back when new workshops or activities are scheduled.
            </p>
            <Link
              to="/"
              className="mt-2 inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              Return to Dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5 pt-2">
            {notifications.map((notif) => {
              const Icon = notif.icon;
              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (notif.meetUrl) {
                      window.open(notif.meetUrl, "_blank");
                    } else {
                      navigate(notif.link);
                    }
                  }}
                  className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-800 hover:border-blue-500/40 dark:hover:border-blue-500/40 shadow-xs flex items-start gap-3.5 cursor-pointer active:scale-[0.99] transition-all"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      notif.badgeColor === "rose"
                        ? "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40"
                        : "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40"
                    }`}
                  >
                    <Icon className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 truncate">
                        {notif.subtitle}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                          notif.badgeColor === "rose"
                            ? "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300"
                            : "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300"
                        }`}
                      >
                        {notif.badge}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate mt-0.5">
                      {notif.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{notif.time}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
