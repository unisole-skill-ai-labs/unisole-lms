import React from "react";
import { cn } from "../../lib/utils";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "indigo" | "emerald" | "amber" | "rose" | "purple" | "slate" | "white";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function Badge({
  children,
  variant = "indigo",
  size = "md",
  className = "",
}: BadgeProps) {
  const sizeStyles = {
    sm: "px-2 py-0.5 text-[10px] rounded-md",
    md: "px-2.5 py-1 text-xs rounded-lg",
    lg: "px-3.5 py-1.5 text-sm rounded-xl",
  };

  const variantStyles = {
    indigo: "bg-indigo-50 text-indigo-700 border border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border border-amber-100",
    rose: "bg-rose-50 text-rose-700 border border-rose-100",
    purple: "bg-purple-50 text-purple-700 border border-purple-100",
    slate: "bg-slate-100 text-slate-700 border border-slate-200",
    white: "bg-white text-slate-900 border border-slate-200 shadow-xs",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium tracking-wide",
        sizeStyles[size] || sizeStyles.md,
        variantStyles[variant] || variantStyles.indigo,
        className
      )}
    >
      {children}
    </span>
  );
}
