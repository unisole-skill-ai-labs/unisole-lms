import React from "react";
import { Link } from "react-router-dom";
import { BookOpen, CheckCircle2, Compass, Play, Layers } from "lucide-react";
import { useGetMyPathwaysQuery } from "../store/apiSlice";
import Badge from "../components/ui/Badge";
import Spinner from "../components/ui/Spinner";
import Button from "../components/ui/Button";
import MacFolderIcon from "../components/ui/MacFolderIcon";

export default function EnrolledCoursesPage() {
  const { data: myPathways = [], isLoading } = useGetMyPathwaysQuery(undefined);

  const totalEnrolled = myPathways.length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-fade-in">
      {/* Page Header with Compact Enrolled Count Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
              My Learning
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
              <BookOpen className="w-3 h-3 stroke-[2.2]" />
              <span>{totalEnrolled} {totalEnrolled === 1 ? "Enrolled Course" : "Enrolled Courses"}</span>
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">
            Courses and curriculums you are actively enrolled in
          </p>
        </div>

        <Link to="/catalog">
          <Button variant="outline" size="sm" icon={Compass}>
            Explore Catalog
          </Button>
        </Link>
      </div>

      {/* Enrolled Courses Grid */}
      {isLoading ? (
        <div className="py-16 text-center">
          <Spinner label="Loading your enrolled courses..." size="lg" />
        </div>
      ) : totalEnrolled === 0 ? (
        <div className="macos-card rounded-3xl p-10 text-center space-y-4 max-w-md mx-auto">
          <MacFolderIcon size="lg" color="blue" className="mx-auto mb-2" />
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            No active enrolled courses yet
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xs mx-auto">
            You haven't enrolled in any courses yet. Browse our curated catalog to start your learning journey!
          </p>
          <Link to="/catalog">
            <Button variant="primary" size="sm" icon={Compass}>
              Browse Pathways Catalog
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {myPathways.map((item: any) => {
            const pathway = item.pathway || item;
            if (!pathway) return null;
            const title = pathway.title || pathway.name || "";
            const isAnalytics = title.toLowerCase().includes("analytic") || title.toLowerCase().includes("data");
            const isWeb = title.toLowerCase().includes("web") || title.toLowerCase().includes("full stack");
            const folderColor = isAnalytics ? "amber" : isWeb ? "emerald" : "blue";

            return (
              <div
                key={item.enrollmentId || pathway.id}
                className="p-5 flex flex-col justify-between h-full macos-card rounded-2xl group active:scale-[0.99] transition-all"
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <MacFolderIcon size="md" color={folderColor} className="shrink-0 group-hover:rotate-[-2deg] transition-transform" />
                      <div>
                        <Badge variant="emerald" size="sm" className="gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </Badge>
                        <div className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 font-mono mt-1">
                          {item.enrolledAt ? new Date(item.enrolledAt).toLocaleDateString("en-IN") : "Enrolled"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {pathway.title}
                  </h3>

                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                    {pathway.shortDescription || pathway.description || "Comprehensive modular learning curriculum."}
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-500" />
                    Full Access
                  </span>

                  <Link to={`/learn/${pathway.id}`}>
                    <Button size="sm" variant="primary" icon={Play}>
                      Continue Learning
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
