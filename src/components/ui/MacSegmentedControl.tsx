import React from "react";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  badge?: number | string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface MacSegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
}

export default function MacSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = "",
  size = "md",
}: MacSegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      className={`inline-flex items-center p-1 bg-slate-200/70 dark:bg-zinc-800/80 backdrop-blur-md rounded-xl border border-slate-300/40 dark:border-zinc-700/50 select-none shadow-inner ${className}`}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(option.value)}
            className={`relative flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-200 ease-out cursor-pointer ${
              size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-xs sm:text-sm"
            } ${
              isSelected
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_1px_rgba(0,0,0,0.06)]"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-white/40 dark:hover:bg-zinc-700/40"
            }`}
          >
            {Icon && (
              <Icon
                className={`w-3.5 h-3.5 transition-colors ${
                  isSelected ? "text-blue-600 dark:text-blue-400" : "text-zinc-500 dark:text-zinc-400"
                }`}
              />
            )}
            <span>{option.label}</span>
            {option.badge !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5 ${
                  isSelected
                    ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                    : "bg-slate-300/60 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {option.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
