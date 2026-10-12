import React from "react";

export type MacFolderColor = "blue" | "graphite" | "purple" | "amber" | "emerald" | "rose";

interface MacFolderIconProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  color?: MacFolderColor;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  isOpen?: boolean;
}

const colorThemes: Record<
  MacFolderColor,
  {
    backGradient: [string, string];
    frontGradient: [string, string, string];
    tabFill: string;
    lipHighlight: string;
    embossColor: string;
    shadowColor: string;
    creaseColor: string;
  }
> = {
  blue: {
    backGradient: ["#3BA0F3", "#1268DB"],
    frontGradient: ["#57BEFF", "#1F84F8", "#0C64DE"],
    tabFill: "#3BA0F3",
    lipHighlight: "rgba(255, 255, 255, 0.75)",
    embossColor: "rgba(255, 255, 255, 0.92)",
    shadowColor: "rgba(10, 80, 180, 0.35)",
    creaseColor: "rgba(12, 60, 140, 0.22)",
  },
  purple: {
    backGradient: ["#9F75FF", "#6833E0"],
    frontGradient: ["#B894FF", "#7E45F5", "#5A22D0"],
    tabFill: "#9F75FF",
    lipHighlight: "rgba(255, 255, 255, 0.75)",
    embossColor: "rgba(255, 255, 255, 0.92)",
    shadowColor: "rgba(70, 20, 160, 0.35)",
    creaseColor: "rgba(50, 10, 120, 0.22)",
  },
  amber: {
    backGradient: ["#F6B343", "#D97706"],
    frontGradient: ["#FCD36E", "#F59E0B", "#B45309"],
    tabFill: "#F6B343",
    lipHighlight: "rgba(255, 255, 255, 0.8)",
    embossColor: "rgba(255, 255, 255, 0.95)",
    shadowColor: "rgba(160, 80, 10, 0.35)",
    creaseColor: "rgba(120, 50, 5, 0.22)",
  },
  emerald: {
    backGradient: ["#34D399", "#059669"],
    frontGradient: ["#6EE7B7", "#10B981", "#047857"],
    tabFill: "#34D399",
    lipHighlight: "rgba(255, 255, 255, 0.75)",
    embossColor: "rgba(255, 255, 255, 0.92)",
    shadowColor: "rgba(5, 100, 60, 0.35)",
    creaseColor: "rgba(4, 70, 40, 0.22)",
  },
  rose: {
    backGradient: ["#FB7185", "#E11D48"],
    frontGradient: ["#FDA4AF", "#F43F5E", "#BE123C"],
    tabFill: "#FB7185",
    lipHighlight: "rgba(255, 255, 255, 0.75)",
    embossColor: "rgba(255, 255, 255, 0.92)",
    shadowColor: "rgba(160, 20, 60, 0.35)",
    creaseColor: "rgba(120, 10, 40, 0.22)",
  },
  graphite: {
    backGradient: ["#64748B", "#334155"],
    frontGradient: ["#94A3B8", "#475569", "#1E293B"],
    tabFill: "#64748B",
    lipHighlight: "rgba(255, 255, 255, 0.65)",
    embossColor: "rgba(255, 255, 255, 0.9)",
    shadowColor: "rgba(20, 30, 45, 0.4)",
    creaseColor: "rgba(15, 23, 42, 0.25)",
  },
};

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
  xl: "w-20 h-20",
};

export default function MacFolderIcon({
  className = "",
  size = "md",
  color = "blue",
  icon,
  badge,
  isOpen = false,
}: MacFolderIconProps) {
  const theme = colorThemes[color] || colorThemes.blue;
  const idPrefix = `mac-folder-${color}-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none group transition-transform duration-300 ease-out hover:scale-105 active:scale-95 ${sizeClasses[size]} ${className}`}
    >
      <svg
        viewBox="0 0 100 86"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.12)] dark:drop-shadow-[0_6px_12px_rgba(0,0,0,0.35)]"
      >
        <defs>
          {/* Back Tab & Back Body Gradient */}
          <linearGradient id={`${idPrefix}-back`} x1="50" y1="8" x2="50" y2="76" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={theme.backGradient[0]} />
            <stop offset="100%" stopColor={theme.backGradient[1]} />
          </linearGradient>

          {/* Front Flap Gradient */}
          <linearGradient id={`${idPrefix}-front`} x1="50" y1="26" x2="50" y2="84" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={theme.frontGradient[0]} />
            <stop offset="45%" stopColor={theme.frontGradient[1]} />
            <stop offset="100%" stopColor={theme.frontGradient[2]} />
          </linearGradient>

          {/* Paper / File Inserts Gradient (visible when open or subtle top hint) */}
          <linearGradient id={`${idPrefix}-paper`} x1="50" y1="14" x2="50" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>

          {/* Top Lip Specular Reflection */}
          <linearGradient id={`${idPrefix}-highlight`} x1="6" y1="28" x2="94" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.4)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.85)" />
          </linearGradient>

          {/* Bottom ambient shadow */}
          <filter id={`${idPrefix}-shadow`} x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor={theme.shadowColor} />
          </filter>
        </defs>

        {/* 1. Back Tab & Folder Back Plate */}
        <path
          d="M 12 12 
             C 12 8, 15 6, 20 6 
             L 38 6 
             C 42 6, 45 9, 48 13 
             L 52 17 
             C 53 18, 55 19, 58 19 
             L 86 19 
             C 91 19, 94 22, 94 27 
             L 94 72 
             C 94 77, 90 80, 85 80 
             L 15 80 
             C 10 80, 6 77, 6 72 
             L 6 20 
             C 6 15, 8 12, 12 12 Z"
          fill={`url(#${idPrefix}-back)`}
        />

        {/* 2. Paper sheets peeking out from inside folder (macOS Finder paper hint) */}
        <path
          d="M 18 20 
             C 18 16, 20 15, 24 15 
             L 76 15 
             C 80 15, 82 16, 82 20 
             L 82 34 
             L 18 34 Z"
          fill={`url(#${idPrefix}-paper)`}
          opacity="0.85"
        />
        {/* Paper horizontal lines */}
        <line x1="26" y1="21" x2="48" y2="21" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        <line x1="26" y1="26" x2="66" y2="26" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />

        {/* 3. Front Flap (Signature macOS Pocket) */}
        <g
          filter={`url(#${idPrefix}-shadow)`}
          className={`transition-all duration-300 origin-bottom ${
            isOpen ? "scale-y-[0.88] translate-y-1" : "group-hover:translate-y-[-1px]"
          }`}
        >
          {/* Main Front Body */}
          <path
            d="M 12 28 
               C 7 28, 5 31, 5 36 
               L 5 73 
               C 5 78, 9 82, 15 82 
               L 85 82 
               C 91 82, 95 78, 95 73 
               L 95 36 
               C 95 31, 93 28, 88 28 
               Z"
            fill={`url(#${idPrefix}-front)`}
          />

          {/* Subtle Crease / Inset line near top lip */}
          <path
            d="M 8 36 L 92 36"
            stroke={theme.creaseColor}
            strokeWidth="1.2"
          />

          {/* Top Lip Specular White Bevel */}
          <path
            d="M 12 28.5 L 88 28.5"
            stroke={theme.lipHighlight}
            strokeWidth="1.2"
            strokeLinecap="round"
          />

          {/* Outer hairline border for retina crispness */}
          <path
            d="M 12 28 
               C 7 28, 5 31, 5 36 
               L 5 73 
               C 5 78, 9 82, 15 82 
               L 85 82 
               C 91 82, 95 78, 95 73 
               L 95 36 
               C 95 31, 93 28, 88 28 
               Z"
            stroke="rgba(255, 255, 255, 0.22)"
            strokeWidth="0.8"
            fill="none"
          />
        </g>
      </svg>

      {/* Embossed Center Icon / Course Symbol Overlay */}
      <div
        className="absolute inset-0 flex items-center justify-center pt-3 pointer-events-none transition-transform duration-300 group-hover:scale-110"
        style={{ color: theme.embossColor }}
      >
        {icon ? (
          <div className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] opacity-95">
            {icon}
          </div>
        ) : (
          /* Default Apple Style Embossed Graduation / Course Glyphs */
          <svg
            className="w-5 h-5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] opacity-95"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18L12 21L19 17.18V13.18L12 17L5 13.18Z" />
          </svg>
        )}
      </div>

      {/* Optional Badge Indicator (e.g. status dot or tag) */}
      {badge && (
        <div className="absolute -top-1 -right-1 z-10 pointer-events-none">
          {badge}
        </div>
      )}
    </div>
  );
}
