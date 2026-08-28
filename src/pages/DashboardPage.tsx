import React, { useState, useMemo } from "react";
import { Compass, BookOpen, Layers, Sparkles, Award, ShieldCheck, GraduationCap } from "lucide-react";
import { useSelector } from "react-redux";
import {
  useGetPublicPathwaysQuery,
  useGetCategoriesQuery,
  useGetMyPathwaysQuery,
} from "../store/apiSlice";
import PathwayCard from "../features/pathways/PathwayCard";
import PathwayFilter from "../features/pathways/PathwayFilter";
import Spinner from "../components/ui/Spinner";
import Button from "../components/ui/Button";

export default function DashboardPage() {
  const { isAuthenticated } = useSelector((state: any) => state.auth);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: pathways = [], isLoading: isPathwaysLoading } = useGetPublicPathwaysQuery(undefined);
  const { data: categories = [] } = useGetCategoriesQuery(undefined);
  const { data: myPathways = [] } = useGetMyPathwaysQuery(undefined, {
    skip: !isAuthenticated,
  });

  const enrolledPathwayIds = useMemo(() => {
    const ids = new Set();
    myPathways.forEach((item: any) => {
      if (item.pathway?.id) ids.add(item.pathway.id);
    });
    return ids;
  }, [myPathways]);

  // Client-side filtering
  const filteredPathways = useMemo(() => {
    return pathways.filter((p: any) => {
      const matchCat = selectedCategory
        ? (p.categories || []).some((c: any) => c.id === selectedCategory || c.name === selectedCategory)
        : true;
      const matchSearch = searchTerm
        ? p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.shortDescription && p.shortDescription.toLowerCase().includes(searchTerm.toLowerCase()))
        : true;
      return matchCat && matchSearch;
    });
  }, [pathways, selectedCategory, searchTerm]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 animate-fade-in">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-indigo-950 via-zinc-900 to-zinc-950 dark:from-indigo-950 dark:via-zinc-950 dark:to-black rounded-3xl p-6 sm:p-10 text-white shadow-2xl relative overflow-hidden border border-zinc-800/80">
        <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 dark:bg-white/5 backdrop-blur-md text-xs font-semibold text-indigo-200 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Curated Skill Pathways & AI Labs</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            Job-Ready Skills with <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-300">Structured Pathways</span>
          </h1>

          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-xl">
            Explore industry-crafted curriculums featuring reusable courses, modules, and hands-on video lessons tailored for college learners and engineering professionals.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-semibold text-zinc-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>College Verified</span>
            </div>
            <div className="flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-indigo-400" />
              <span>Modular Credits</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Industry Certified</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <PathwayFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onReset={() => {
          setSelectedCategory("");
          setSearchTerm("");
        }}
      />

      {/* Pathways Grid */}
      {isPathwaysLoading ? (
        <Spinner label="Loading pathways catalog..." size="lg" />
      ) : filteredPathways.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 p-12 text-center space-y-3 max-w-md mx-auto shadow-xs">
          <Compass className="w-10 h-10 text-zinc-400 mx-auto" />
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">No pathways matched your criteria</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Try adjusting your search terms or clearing the selected category filter.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedCategory("");
              setSearchTerm("");
            }}
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPathways.map((pathway: any) => (
            <PathwayCard
              key={pathway.id}
              pathway={pathway}
              isEnrolled={enrolledPathwayIds.has(pathway.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
