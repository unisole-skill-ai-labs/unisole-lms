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
    return myPathways
      .map((item: any) => item.pathway || item)
      .filter((p: any) => p && (p.title || p.name));
  }, [myPathways]);



  // Dynamic completed and scheduled activities from backend
  const completedList = useMemo(() => {
    return activitiesData?.completed || [];
  }, [activitiesData]);

  const activeList = useMemo(() => {
    const scheduledGroups = activitiesData?.scheduled || [];
    return scheduledGroups.flatMap((g: any) => g.items || []);
  }, [activitiesData]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/70 dark:bg-[#0B0D13] py-4 sm:py-8 transition-colors">
      <div className="max-w-2xl lg:max-w-3xl mx-auto px-4 sm:px-6 space-y-6">

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
            <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Learning Activities
            </h2>

            {/* Apple macOS Segmented Control */}
            <MacSegmentedControl<"active" | "completed">
              value={activeTab}
              onChange={(val) => setActiveTab(val)}
              options={[
                { value: "active", label: "Active", badge: activeList.length > 0 ? activeList.length : undefined },
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
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-[#DCF8C6]/80 dark:bg-lime-950/50 border border-lime-200/70 dark:border-lime-900/30 flex items-center justify-center text-lime-800 dark:text-lime-400 shadow-2xs">
                          <FileQuestion className="w-5 h-5 stroke-[1.8]" />
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center border-2 border-white dark:border-[#121622] shadow-xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    </div>

                    {/* Activity Metadata Column */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 truncate">
                        {item.category} · {item.course}
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
          ) : activeList.length > 0 ? (
            <div className="space-y-3">
              {activeList.slice(0, 5).map((item: any) => (
                <div
                  key={item.id}
                  onClick={() => item.pathwayId && navigate(`/learn/${item.pathwayId}`)}
                  className="macos-card rounded-2xl p-3.5 sm:p-4 flex items-center gap-3.5 cursor-pointer group active:scale-[0.99] transition-all"
                >
                  <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-2xs">
                    {item.type === "quiz" ? (
                      <FileQuestion className="w-5 h-5 stroke-[1.8]" />
                    ) : (
                      <FileText className="w-5 h-5 stroke-[1.8]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] sm:text-xs font-semibold text-amber-600 dark:text-amber-400 truncate">
                      {item.category} · {item.course}
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate mt-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {item.title}
                    </h4>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5 font-medium">
                      {item.dateText}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="macos-card rounded-3xl p-8 sm:p-10 shadow-2xs flex flex-col items-center justify-center text-center">
              {/* Illustration Matching Great Learning Design */}
              <div className="w-48 h-40 relative flex items-center justify-center">
                <svg
                  className="w-full h-full max-w-[190px]"
                  viewBox="0 0 200 160"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Background Clock */}
                  <circle cx="85" cy="70" r="42" stroke="#CBD5E1" strokeWidth="2.5" strokeDasharray="4 4" fill="#F8FAFC" />
                  <path d="M85 45V70L102 70" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="85" cy="70" r="3" fill="#64748B" />

                  {/* Gear Accent */}
                  <circle cx="50" cy="115" r="10" stroke="#CBD5E1" strokeWidth="2" fill="#FFFFFF" />
                  <circle cx="50" cy="115" r="4" fill="#94A3B8" />

                  {/* Growth Bar Chart / Steps */}
                  <rect x="70" y="105" width="22" height="45" rx="3" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1.8" />
                  <rect x="95" y="85" width="24" height="65" rx="3" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1.8" />
                  <rect x="122" y="65" width="24" height="85" rx="3" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1.8" />

                  {/* Learner Character Sitting on Step */}
                  <path d="M108 95L108 120L95 120" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  <path d="M116 95L116 122L125 122" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  <rect x="106" y="65" width="16" height="30" rx="4" fill="#DBEAFE" stroke="#2563EB" strokeWidth="2" />
                  <circle cx="114" cy="54" r="7" fill="#FEF3C7" stroke="#1E293B" strokeWidth="1.8" />
                  <path d="M110 50C110 46 117 46 119 50" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M106 75L94 85" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
                  <rect x="85" y="82" width="14" height="8" rx="1.5" transform="rotate(-15 85 82)" fill="#94A3B8" stroke="#475569" strokeWidth="1.5" />
                  <path d="M120 72L100 58" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>

              {/* Title & Subtitle */}
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-2">
                You're all caught up
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs leading-relaxed">
                Check in later for new activities
              </p>

              {/* Solid Blue Button */}
              <button
                onClick={() => navigate("/activities")}
                className="mt-5 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold py-2.5 px-6 rounded-full shadow-xs transition-all cursor-pointer"
              >
                <span>View All Activities</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
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
