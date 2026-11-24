import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  BookOpen,
  Layers,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building2,
  Sparkles,
  Lock,
  GraduationCap,
  Clock,
} from "lucide-react";
import {
  useGetPublicPathwayBySlugQuery,
  useGetMyPathwaysQuery,
} from "../store/apiSlice";
import { getWebsiteUrl } from "../utils/env";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Card from "../components/ui/Card";
import Spinner from "../components/ui/Spinner";
import NotFoundPage from "./NotFoundPage";

export default function PathwayDetailPage() {
  const { slug: rawSlug } = useParams();
  const slug = rawSlug === "course1" ? "cs-agentic" : rawSlug;
  const navigate = useNavigate();

  useEffect(() => {
    if (rawSlug === "course1") {
      navigate("/pathways/cs-agentic", { replace: true });
    }
  }, [rawSlug, navigate]);
  const { isAuthenticated } = useSelector((state: any) => state.auth);

  const { data: pathway, isLoading } = useGetPublicPathwayBySlugQuery(slug);
  const { data: myPathways = [] } = useGetMyPathwaysQuery(undefined, {
    skip: !isAuthenticated,
  });

  const isEnrolled = pathway && myPathways.some((p: any) => 
    p.pathway?.id === pathway.id || 
    p.pathway?.slug === pathway.slug || 
    p.pathway?.id === slug || 
    p.pathway?.slug === slug
  );
  const priceRupees = pathway ? (pathway.pricePaise || 0) / 100 : 0;
  const categories = pathway?.categories || [];
  const colleges = pathway?.colleges || [];
  const courses = pathway?.courses || [];

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <Spinner label="Loading pathway curriculum..." size="lg" />
      </div>
    );
  }

  if (!pathway) {
    return <NotFoundPage />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      {/* Back Link */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>

      {/* Hero Card & Purchase Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Main Details (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {categories.map((cat: any) => (
                <Badge key={cat.id || cat} variant="brand" size="md">
                  {cat.name || cat}
                </Badge>
              ))}
              {colleges.map((col: any) => (
                <Badge key={col.id || col} variant="default" size="md">
                  <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                  {col.shortName || col.name}
                </Badge>
              ))}
              {isEnrolled && (
                <Badge variant="emerald" size="md">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active Enrollment
                </Badge>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-zinc-900 dark:text-zinc-100 leading-tight">
              {pathway.title}
            </h1>

            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {pathway.description || pathway.shortDescription || "Comprehensive structured pathway designed for real-world mastery."}
            </p>

            <div className="flex flex-wrap items-center gap-6 text-xs text-zinc-500 dark:text-zinc-400 font-medium pt-3 border-t border-zinc-200/80 dark:border-zinc-800">
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                <span>{courses.length > 0 ? courses.length : (pathway?.modules?.length || 12)} Curriculum Modules</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-500" />
                <span>Modular Reusable Tracks</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Verified Certificate</span>
              </div>
            </div>
          </div>

          {/* Included Courses Section */}
          <div className="space-y-4 pt-4">
            <h3 className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100">Curriculum & Weekly Breakdown</h3>
            <div className="space-y-3">
              {courses.length === 0 && (!pathway?.modules || pathway.modules.length === 0) ? (
                <p className="text-xs text-zinc-400 italic">No courses currently attached to this pathway.</p>
              ) : courses.length > 0 ? (
                courses.map((course: any, idx: number) => (
                  <div
                    key={course.id}
                    className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-xs"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-extrabold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                          {course.title}
                        </h4>
                        {course.shortDescription && (
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                            {course.shortDescription}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                (pathway.modules || []).map((mod: any, idx: number) => (
                  <div
                    key={mod.num || idx}
                    className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-xs"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-extrabold text-xs flex items-center justify-center shrink-0">
                        {mod.num || idx + 1}
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                          {mod.title}
                        </h4>
                        {mod.topics && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {mod.topics.map((t: string, tIdx: number) => (
                              <span
                                key={tIdx}
                                className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[11px]"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        {mod.practical && (
                          <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium pt-1">
                            Lab: {mod.practical}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Pricing Card (Right col) */}
        <div className="lg:col-span-1 sticky top-24">
          <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl shadow-xl space-y-5">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">
                Lifetime Enrollment Access
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-zinc-900 dark:text-zinc-100">
                  {priceRupees === 0 ? "Free" : `₹${priceRupees.toLocaleString("en-IN")}`}
                </span>
                <span className="text-xs text-zinc-400 font-medium">/ one-time investment</span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-zinc-600 dark:text-zinc-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Full access to all {courses.length} courses & lessons</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Interactive video player & code study notes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Direct partner college verified curriculum</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Lifetime access & syllabus updates</span>
              </div>
            </div>

            {isEnrolled ? (
              <Link to={`/learn/${pathway.id}`} className="block">
                <Button variant="primary" size="lg" className="w-full shadow-lg shadow-indigo-500/20">
                  Continue Learning
                </Button>
              </Link>
            ) : (
              <a href={`${getWebsiteUrl()}/programs`} className="block">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full shadow-lg shadow-indigo-500/20"
                >
                  Enroll via Unisole
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
