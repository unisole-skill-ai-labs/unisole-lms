import React, { useState, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  FileQuestion,
  FileText,
  Video,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Layers,
  Check,
  Play,
  Sparkles,
  ChevronRight,
  AlertCircle,
  Clock,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { useGetMyPathwaysQuery, useGetStudentActivitiesQuery } from "../store/apiSlice";
import MacFolderIcon, { MacFolderColor } from "../components/ui/MacFolderIcon";
import MacSegmentedControl from "../components/ui/MacSegmentedControl";

// Helper to determine macOS folder color based on course title / topic
const getFolderColor = (title: string = ""): MacFolderColor => {
  const t = title.toLowerCase();
  if (t.includes("analytic") || t.includes("data") || t.includes("excel")) return "amber";
  if (t.includes("ai") || t.includes("machine learning") || t.includes("python")) return "blue";
  if (t.includes("web") || t.includes("full stack") || t.includes("react")) return "emerald";
  if (t.includes("science") || t.includes("math")) return "purple";
  return "blue";
};

export default function DashboardPage() {
  const { isAuthenticated, user } = useSelector((state: any) => state.auth);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Default to "completed" tab as shown in the reference screenshot
  const [activeTab, setActiveTab] = useState<"active" | "completed">(() => {
    const tab = searchParams.get("tab");
    return tab === "active" ? "active" : "completed";
  });

  const { data: myPathways = [], isLoading: isPathwaysLoading } = useGetMyPathwaysQuery(undefined, {
    skip: !isAuthenticated,
  });

  const { data: activitiesData, isLoading: isActivitiesLoading } = useGetStudentActivitiesQuery(undefined, {
    skip: !isAuthenticated,
  });

  const enrolledCourses = useMemo(() => {
    const list = myPathways
      .map((item: any) => item.pathway || item)
      .filter((p: any) => p && (p.title || p.name));

    if (list.length === 0) {
      return [
        {
          id: "course1",
          slug: "course1",
          title: "AI Agent Engineering",
          shortDescription: "12-Week AI Agent Engineering Certificate Program (Weeks 1 - 12)",
        },
        {
          id: "web-dev",
          slug: "web-dev",
          title: "Full Stack Software Engineering",
          shortDescription: "Modular curriculum: Module 1, Module 2, Module 3 with lecture, question, assignment, live",
        },
      ];
    }

    const hasAgentCourse = list.some(
      (c: any) =>
        c.id === "course1" ||
        (c.title && c.title.toLowerCase().includes("agent"))
    );
    if (!hasAgentCourse) {
      return [
        {
          id: "course1",
          slug: "course1",
          title: "AI Agent Engineering",
          shortDescription: "12-Week AI Agent Engineering Certificate Program (Weeks 1 - 12)",
        },
        ...list,
      ];
    }

    return list;
  }, [myPathways]);



  // Dynamic completed and scheduled activities from backend
  const enrolledCourseTitle = activitiesData?.courseName || enrolledCourses[0]?.title || "AI Agent Engineering: From Fundamentals to Production";
  const primaryPathwayId = activitiesData?.pathwayId || enrolledCourses[0]?.id || "cs-agentic";

  const missedList = useMemo(() => {
    return activitiesData?.missed || [];
  }, [activitiesData]);

  const upcomingList = useMemo(() => {
    return activitiesData?.upcoming || [];
  }, [activitiesData]);

  const completedList = useMemo(() => {
    return activitiesData?.completed || [];
  }, [activitiesData]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/70 dark:bg-[#0B0D13] py-4 sm:py-8 transition-colors">
      <div className="max-w-4xl lg:max-w-5xl mx-auto px-4 sm:px-6 space-y-6">

        {/* ─── Continue Learning: Vertical Course Cards (Matching Reference) ─── */}
        {enrolledCourses.length === 0 ? (
          /* Empty Enrolled Courses Card */
          <div
            onClick={() => navigate("/catalog")}
            className="macos-card rounded-2xl p-4 sm:p-5 flex items-center gap-4 cursor-pointer group"
          >
            <MacFolderIcon size="md" color="blue" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Explore Learning Pathways
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate">
                Enroll in a curriculum to start your hands-on journey
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all shrink-0" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-0.5">
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Continue Learning
              </h2>
              {enrolledCourses.length > 2 && (
                <Link
                  to="/enrolled"
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <span>View All ({enrolledCourses.length})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            <div className="flex flex-col space-y-3">
              {enrolledCourses.map((c: any, idx: number) => {
                const cTitle = c.title || c.name;
                const courseId = c.id || c.slug;
                const folderColor = getFolderColor(cTitle);
                const path = `/learn/${courseId}`;
                const subtitle = c.shortDescription || "Continue your next structured learning milestone";

                return (
                  <div
                    key={c.id || idx}
                    onClick={() => navigate(path)}
                    className="macos-card rounded-2xl p-4 sm:p-4.5 flex items-center gap-3.5 cursor-pointer group active:scale-[0.99] transition-all"
                  >
                    <MacFolderIcon
                      size="md"
                      color={folderColor}
                      className="group-hover:rotate-[-2deg] transition-transform shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {cTitle}
                        </h3>
                        {idx === 0 && (
                          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        <Video className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0 stroke-[2]" />
                        <span className="truncate">{subtitle}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(path);
                      }}
                      className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
                    >
                      <span>Continue</span>
                      <Play className="w-3 h-3 fill-current" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Learning Activities Section ─── */}
        <section className="space-y-4 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Learning Activities
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Enrolled Course:</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-xs border border-blue-200/60 dark:border-blue-900/40">
                  <BookOpen className="w-3 h-3" />
                  {enrolledCourseTitle}
                </span>
              </div>
            </div>

            {/* Apple macOS Segmented Control */}
            <MacSegmentedControl<"active" | "completed">
              value={activeTab}
              onChange={(val) => setActiveTab(val)}
              options={[
                { value: "active", label: "Active", badge: (missedList.length + upcomingList.length) > 0 ? (missedList.length + upcomingList.length) : undefined },
                { value: "completed", label: "Completed", badge: completedList.length > 0 ? completedList.length : undefined },
              ]}
            />
          </div>

          {/* Tab Content */}
          {activeTab === "completed" ? (
            completedList.length === 0 ? (
              /* Empty Completed State matching screenshot with macOS glassmorphism */
              <div className="macos-card rounded-3xl p-8 sm:p-10 text-center space-y-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-2xs border border-blue-100 dark:border-blue-900/40">
                  <CheckCircle2 className="w-6 h-6 stroke-[1.8]" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                  No completed learning activities yet
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
                  Complete video lectures, quizzes, or hands-on assignments to track your progress and marks here.
                </p>
                {enrolledCourses.length > 0 ? (
                  <button
                    onClick={() => navigate(`/learn/${enrolledCourses[0]?.id || enrolledCourses[0]?.slug}`)}
                    className="mt-3 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold py-2.5 px-6 rounded-full shadow-xs transition-all cursor-pointer"
                  >
                    <span>Start Learning</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => navigate("/catalog")}
                    className="mt-3 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold py-2.5 px-6 rounded-full shadow-xs transition-all cursor-pointer"
                  >
                    <span>Explore Catalog</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {completedList.map((item: any) => (
                  <div
                    key={item.id}
                    onClick={() => item.pathwayId && navigate(`/learn/${item.pathwayId}`)}
                    className="macos-card rounded-2xl p-3.5 sm:p-4 flex items-center gap-3.5 cursor-pointer group active:scale-[0.99] transition-all"
                  >
                    {/* Left Icon with Green Checkmark Badge */}
                    <div className="relative shrink-0">
                      {item.type === "assignment" ? (
                        <div className="w-11 h-11 rounded-xl bg-rose-100/80 dark:bg-rose-950/50 border border-rose-200/60 dark:border-rose-900/30 flex items-center justify-center text-rose-500 dark:text-rose-400 shadow-2xs">
                          <FileText className="w-5 h-5 stroke-[1.8]" />
                        </div>
                      ) : item.type === "quiz" ? (
                        <div className="w-11 h-11 rounded-xl bg-[#DCF8C6]/80 dark:bg-lime-950/50 border border-lime-200/70 dark:border-lime-900/30 flex items-center justify-center text-lime-800 dark:text-lime-400 shadow-2xs">
                          <FileQuestion className="w-5 h-5 stroke-[1.8]" />
                        </div>
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-sky-100/80 dark:bg-sky-950/50 border border-sky-200/70 dark:border-sky-900/30 flex items-center justify-center text-sky-800 dark:text-sky-400 shadow-2xs">
                          <Video className="w-5 h-5 stroke-[1.8]" />
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center border-2 border-white dark:border-[#121622] shadow-xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    </div>

                    {/* Activity Metadata Column */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 truncate">
                        {item.category} · {item.moduleTitle || item.course}
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate mt-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {item.title}
                      </h4>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5 font-medium">
                        {item.datePrefix}: {item.date} · {item.statusText}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Active View: Split into Missed (Middle/Left) and Upcoming (Right) */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {/* ─── Middle Column: Missed Activities ─── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                      Missed Activities
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/40">
                    {missedList.length} Missed
                  </span>
                </div>

                {missedList.length === 0 ? (
                  <div className="macos-card rounded-2xl p-6 text-center space-y-2 border border-slate-200/80 dark:border-slate-800">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto stroke-[1.8]" />
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      No Missed Activities
                    </h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      You're all caught up! No overdue lectures, quizzes, or assignments.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {missedList.map((item: any) => (
                      <div
                        key={item.id}
                        onClick={() => navigate(`/learn/${item.pathwayId || primaryPathwayId}?lesson=${item.lessonId}`)}
                        className="macos-card rounded-2xl p-3 sm:p-3.5 flex items-start gap-3 cursor-pointer group active:scale-[0.99] transition-all border border-rose-200/70 dark:border-rose-900/40 hover:border-rose-400/60 dark:hover:border-rose-700/60"
                      >
                        <div className="w-9 h-9 rounded-xl bg-rose-100/80 dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-900/40 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 shadow-2xs mt-0.5">
                          {item.type === "quiz" ? (
                            <FileQuestion className="w-4 h-4 stroke-[1.8]" />
                          ) : item.type === "assignment" ? (
                            <FileText className="w-4 h-4 stroke-[1.8]" />
                          ) : (
                            <Video className="w-4 h-4 stroke-[1.8]" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 truncate">
                            {item.category} · {item.moduleTitle || "Week 1"}
                          </div>
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate mt-0.5 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                            {item.title}
                          </h4>
                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3 text-rose-500 shrink-0" />
                            <span>{item.dateText}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/learn/${item.pathwayId || primaryPathwayId}?lesson=${item.lessonId}`);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shadow-xs transition-colors shrink-0 self-center"
                        >
                          {item.actionText || "Catch Up"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ─── Right Side Column: Upcoming Activities ─── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                    <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                      Upcoming Activities
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-900/40">
                    {upcomingList.length} Upcoming
                  </span>
                </div>

                {upcomingList.length === 0 ? (
                  <div className="macos-card rounded-2xl p-6 text-center space-y-2 border border-slate-200/80 dark:border-slate-800">
                    <Sparkles className="w-8 h-8 text-sky-500 mx-auto stroke-[1.8]" />
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      No Upcoming Deliverables
                    </h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Check back soon for new live classes, quizzes, and deliverables.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {upcomingList.slice(0, 6).map((item: any) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (item.type === "live" && item.meetUrl) {
                            window.open(item.meetUrl, "_blank");
                          } else {
                            navigate(`/learn/${item.pathwayId || primaryPathwayId}?lesson=${item.lessonId}`);
                          }
                        }}
                        className="macos-card rounded-2xl p-3 sm:p-3.5 flex items-start gap-3 cursor-pointer group active:scale-[0.99] transition-all border border-sky-200/60 dark:border-sky-900/40 hover:border-sky-400/60 dark:hover:border-sky-700/60"
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs mt-0.5 ${
                          item.type === "live"
                            ? "bg-sky-100/80 dark:bg-sky-950/60 border border-sky-200/60 dark:border-sky-900/40 text-sky-600 dark:text-sky-400"
                            : item.type === "quiz"
                            ? "bg-purple-100/80 dark:bg-purple-950/60 border border-purple-200/60 dark:border-purple-900/40 text-purple-600 dark:text-purple-400"
                            : "bg-blue-100/80 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-900/40 text-blue-600 dark:text-blue-400"
                        }`}>
                          {item.type === "live" ? (
                            <Video className="w-4 h-4 stroke-[1.8]" />
                          ) : item.type === "quiz" ? (
                            <FileQuestion className="w-4 h-4 stroke-[1.8]" />
                          ) : (
                            <FileText className="w-4 h-4 stroke-[1.8]" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-sky-600 dark:text-sky-400 truncate">
                            {item.isToday && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300">
                                TODAY
                              </span>
                            )}
                            <span className="truncate">{item.category} · {item.moduleTitle || "Week 2"}</span>
                          </div>
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate mt-0.5 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                            {item.title}
                          </h4>
                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5 font-medium flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-sky-500 shrink-0" />
                            <span>{item.dateText}</span>
                          </div>
                        </div>

                        {item.type === "live" && item.meetUrl ? (
                          <a
                            href={item.meetUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold shadow-xs transition-colors shrink-0 self-center flex items-center gap-1"
                          >
                            <span>Join</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/learn/${item.pathwayId || primaryPathwayId}?lesson=${item.lessonId}`);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-xs transition-colors shrink-0 self-center"
                          >
                            {item.actionText || "Start"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ─── Explore More Catalog Link ─── */}
        <div className="text-center pt-2 pb-4">
          <Link
            to="/catalog"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-1.5 px-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Looking for more pathways? Browse Full Catalog</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
