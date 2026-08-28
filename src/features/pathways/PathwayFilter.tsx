import React from "react";
import { Search, X, Filter } from "lucide-react";
import Button from "../../components/ui/Button";

interface PathwayFilterProps {
  categories: any[];
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onReset: () => void;
}

export default function PathwayFilter({
  categories = [],
  selectedCategory,
  onSelectCategory,
  searchTerm,
  onSearchChange,
  onReset,
}: PathwayFilterProps) {
  return (
    <div className="space-y-4">
      {/* Search Input Bar */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search pathways by title, technology, or keywords..."
          className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => onSelectCategory("")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
            !selectedCategory
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          }`}
        >
          All Pathways
        </button>

        {categories.map((cat: any) => {
          const isSelected = selectedCategory === cat.id || selectedCategory === cat.name;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(isSelected ? "" : cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                isSelected
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              }`}
            >
              {cat.name}
            </button>
          );
        })}

        {(selectedCategory || searchTerm) && (
          <Button variant="ghost" size="sm" onClick={onReset} className="text-rose-500 hover:text-rose-600 dark:text-rose-400 text-xs">
            Reset Filters
          </Button>
        )}
      </div>
    </div>
  );
}
