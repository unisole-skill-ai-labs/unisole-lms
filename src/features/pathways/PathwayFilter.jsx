import React from "react";
import { Search, X, Filter } from "lucide-react";
import Button from "../../components/ui/Button";

export default function PathwayFilter({
  categories = [],
  selectedCategory,
  onSelectCategory,
  searchTerm,
  onSearchChange,
  onReset,
}) {
  return (
    <div className="space-y-4">
      {/* Search Input Bar */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search pathways by title or topic..."
          className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          All Categories
        </button>

        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id || selectedCategory === cat.name;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(isSelected ? "" : cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                isSelected
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {cat.name}
            </button>
          );
        })}

        {(selectedCategory || searchTerm) && (
          <Button variant="ghost" size="sm" onClick={onReset} className="text-rose-500 hover:text-rose-600 text-xs">
            Reset Filters
          </Button>
        )}
      </div>
    </div>
  );
}
