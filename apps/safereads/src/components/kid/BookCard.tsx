"use client";

import Image from "next/image";
import { BookOpen } from "lucide-react";

interface BookCardProps {
  title: string;
  author: string;
  coverUrl?: string;
  progress?: number; // 0-100
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}

export function BookCard({
  title,
  author,
  coverUrl,
  progress,
  onClick,
  size = "md",
}: BookCardProps) {
  const sizeClasses = {
    sm: "w-24 h-36",
    md: "w-28 h-40",
    lg: "w-32 h-48",
  };

  const textSizeClasses = {
    sm: "text-[11px]",
    md: "text-xs",
    lg: "text-sm",
  };

  const maxWidths = {
    sm: "96px",
    md: "112px",
    lg: "128px",
  };

  return (
    <button
      onClick={onClick}
      className="group flex flex-shrink-0 flex-col items-start text-left"
    >
      <div
        className={`${sizeClasses[size]} book-tilt relative overflow-hidden rounded-xl bg-gray-100 shadow-md ring-1 ring-black/5 transition-all duration-300 group-hover:shadow-xl group-active:scale-[0.96]`}
      >
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={title}
            fill
            sizes={size === "sm" ? "96px" : size === "md" ? "112px" : "128px"}
            className="object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 p-3">
            <BookOpen className="h-6 w-6 text-purple-300" />
            <p className="line-clamp-3 text-center text-[9px] font-medium leading-tight text-purple-600">
              {title}
            </p>
          </div>
        )}

        {/* Progress bar overlay */}
        {progress !== undefined && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/30 p-1.5 backdrop-blur-sm">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
              <div
                className="progress-gradient h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            {progress >= 100 && (
              <p className="mt-0.5 text-center text-[8px] font-bold text-white">
                {"\u2728"} Done!
              </p>
            )}
          </div>
        )}
      </div>

      {/* Title & Author */}
      <p
        className={`mt-2 line-clamp-2 font-semibold leading-tight text-gray-800 transition-colors group-hover:text-purple-700 ${textSizeClasses[size]}`}
        style={{ maxWidth: maxWidths[size] }}
      >
        {title}
      </p>
      <p
        className={`mt-0.5 line-clamp-1 text-gray-400 ${size === "lg" ? "text-xs" : "text-[10px]"}`}
        style={{ maxWidth: maxWidths[size] }}
      >
        {author}
      </p>
    </button>
  );
}
