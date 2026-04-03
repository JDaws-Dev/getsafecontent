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
    sm: "text-[10px]",
    md: "text-xs",
    lg: "text-sm",
  };

  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-start text-left"
    >
      <div
        className={`${sizeClasses[size]} relative overflow-hidden rounded-lg bg-gray-100 shadow-sm transition-all group-hover:shadow-md group-active:scale-[0.97]`}
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
          <div className="flex h-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-emerald-50 to-emerald-100 p-2">
            <BookOpen className="h-6 w-6 text-emerald-300" />
            <p className="line-clamp-3 text-center text-[9px] leading-tight text-emerald-600">
              {title}
            </p>
          </div>
        )}

        {/* Progress bar overlay */}
        {progress !== undefined && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/20 p-1">
            <div className="h-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Title & Author */}
      <p
        className={`mt-1.5 line-clamp-1 font-medium text-gray-800 group-hover:text-emerald-700 ${textSizeClasses[size]}`}
        style={{ maxWidth: size === "sm" ? "96px" : size === "md" ? "112px" : "128px" }}
      >
        {title}
      </p>
      <p
        className={`line-clamp-1 text-gray-400 ${size === "lg" ? "text-xs" : "text-[10px]"}`}
        style={{ maxWidth: size === "sm" ? "96px" : size === "md" ? "112px" : "128px" }}
      >
        {author}
      </p>
    </button>
  );
}
