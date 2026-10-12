import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Newspaper, ArrowLeft, Sparkles } from "lucide-react";
import Button from "../components/ui/Button";

export default function ArticlesPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Industry Articles
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Knowledge Desk</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Curated engineering whitepapers, technical case studies, and industry trends
          </p>
        </div>

        <Link to="/">
          <Button variant="outline" size="sm" icon={ArrowLeft}>
            Dashboard
          </Button>
        </Link>
      </div>

      {/* Empty State Card */}
      <div className="rounded-3xl bg-white dark:bg-[#121622] border border-slate-200/80 dark:border-slate-800 p-8 sm:p-14 text-center space-y-4 shadow-sm max-w-xl mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-xs">
          <Newspaper className="w-7 h-7 stroke-[1.8]" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
            No Articles Published Yet
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
            Our mentors and industry partners are currently preparing technical deep-dives, AI engineering case studies, and industry insights. Check back soon!
          </p>
        </div>

        <div className="pt-2">
          <Button variant="primary" size="sm" onClick={() => navigate("/")}>
            Back to Learning
          </Button>
        </div>
      </div>
    </div>
  );
}
