import React from "react";
import { Link } from "react-router-dom";
import { BookOpen, Layers, ArrowRight, Building2, Sparkles, CheckCircle2 } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";

export default function PathwayCard({ pathway, isEnrolled }: { pathway: any; isEnrolled?: boolean }) {
  const priceRupees = (pathway.pricePaise || 0) / 100;
  const categories = pathway.categories || [];
  const colleges = pathway.colleges || [];
  const courseCount = pathway.courseCount ?? (pathway.courses ? pathway.courses.length : 0);

  return (
    <div className="minimal-card p-6 flex flex-col justify-between h-full group bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl transition-all duration-300 hover:shadow-xl hover:border-indigo-500/30">
      <div>
        {/* Top Badges & College */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.slice(0, 2).map((cat: any) => (
              <Badge key={cat.id || cat} variant="brand" size="sm">
                {cat.name || cat}
              </Badge>
            ))}
            {isEnrolled && (
              <Badge variant="emerald" size="sm" className="gap-1">
                <CheckCircle2 className="w-3 h-3" /> Enrolled
              </Badge>
            )}
          </div>

          {colleges.length > 0 && (
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-indigo-500" />
              {colleges[0].shortName || colleges[0].name}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-extrabold text-base sm:text-lg text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {pathway.title}
        </h3>

        {/* Short Description */}
        <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
          {pathway.shortDescription || pathway.description || "Comprehensive structured pathway designed for job-ready real-world mastery."}
        </p>

        {/* Meta details */}
        <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center gap-4 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
            <span>{courseCount} {courseCount === 1 ? "Course" : "Courses"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-500" />
            <span>Modular Track</span>
          </div>
        </div>
      </div>

      {/* Footer Pricing & Action */}
      <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block tracking-wider font-mono">
            {isEnrolled ? "Access" : "Investment"}
          </span>
          <span className="text-base sm:text-lg font-black text-zinc-900 dark:text-zinc-100">
            {isEnrolled ? "Active" : priceRupees === 0 ? "Free" : `₹${priceRupees.toLocaleString("en-IN")}`}
          </span>
        </div>

        {isEnrolled ? (
          <Link to={`/learn/${pathway.id}`}>
            <Button size="sm" variant="primary" icon={ArrowRight}>
              Continue
            </Button>
          </Link>
        ) : (
          <Link to={`/pathways/${pathway.slug || pathway.id}`}>
            <Button size="sm" variant="outline" icon={ArrowRight}>
              View Syllabus
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
