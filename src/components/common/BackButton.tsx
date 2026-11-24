import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export interface BackButtonProps {
  to?: string;
  onClick?: () => void;
  label?: string;
  className?: string;
  variant?: "default" | "dark" | "pill";
}

export default function BackButton({
  to,
  onClick,
  label = "Back to course",
  className = "",
  variant = "default",
}: BackButtonProps) {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onClick) {
      onClick();
    } else if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  const baseStyles =
    "inline-flex items-center gap-2 min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-500/50 select-none shrink-0";

  const variants = {
    default:
      "text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-zinc-100/80 hover:bg-zinc-200/80 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 active:scale-95",
    dark:
      "text-white/90 hover:text-white bg-white/10 hover:bg-white/20 active:scale-95",
    pill:
      "rounded-full bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 shadow-2xs active:scale-95",
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      <ArrowLeft className="w-4 h-4 stroke-[2.2] shrink-0" />
      {label && <span className="truncate">{label}</span>}
    </button>
  );
}
