"use client";

import Image from "next/image";
import { Headphones } from "lucide-react";
import { StylizedCover } from "./StylizedCover";

interface BookCardProps {
  title: string;
  author: string;
  coverUrl?: string;
  cachedCoverUrl?: string; // Higher-quality cover from the cover cache
  genre?: string;          // For StylizedCover fallback
  progress?: number;       // 0-100
  hasAudio?: boolean;      // Show subtle headphones icon
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}

export function BookCard({
  title,
  author,
  coverUrl,
  cachedCoverUrl,
  genre,
  progress,
  hasAudio,
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

  const maxWidthClasses = {
    sm: "max-w-[96px]",
    md: "max-w-[112px]",
    lg: "max-w-[128px]",
  };

  // Use the best available cover: cached > original > stylized fallback
  const displayCoverUrl = cachedCoverUrl || coverUrl;

  return (
    <button
      onClick={onClick}
      className="group flex flex-shrink-0 flex-col items-start text-left"
    >
      <div
        className={`${sizeClasses[size]} book-tilt relative overflow-hidden rounded-xl bg-gray-100 shadow-md ring-1 ring-black/5 transition-all duration-300 group-hover:shadow-xl group-active:scale-[0.96]`}
      >
        {displayCoverUrl ? (
          <Image
            src={displayCoverUrl}
            alt={title}
            fill
            sizes={size === "sm" ? "96px" : size === "md" ? "112px" : "128px"}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <StylizedCover
            title={title}
            author={author}
            genre={genre}
            size={size}
          />
        )}

        {/* Progress bar overlay */}
        {progress !== undefined && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-black/10 p-1.5 backdrop-blur-sm">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progress >= 100 ? "bg-emerald-400" : "progress-gradient"}`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            {progress >= 100 ? (
              <p className="mt-0.5 text-center text-[8px] font-bold text-emerald-300">
                {"\u2728"} Finished!
              </p>
            ) : (
              <p className="mt-0.5 text-center text-[8px] font-bold text-white/80">
                {Math.round(progress)}%
              </p>
            )}
          </div>
        )}

        {/* Audio indicator (takes priority over new-book sparkle) */}
        {hasAudio ? (
          <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/80 backdrop-blur-sm">
            <Headphones className="h-2.5 w-2.5 text-white" />
          </div>
        ) : progress === undefined ? (
          /* New book shimmer indicator (no progress means not started) */
          <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-[8px] font-bold text-white shadow-sm">
            {"\u2728"}
          </div>
        ) : null}
      </div>

      {/* Title & Author */}
      <p
        className={`mt-2 line-clamp-2 font-semibold leading-tight text-gray-800 transition-colors group-hover:text-purple-700 ${textSizeClasses[size]} ${maxWidthClasses[size]}`}
      >
        {title}
      </p>
      <p
        className={`mt-0.5 line-clamp-1 text-gray-400 ${size === "lg" ? "text-xs" : "text-[10px]"} ${maxWidthClasses[size]}`}
      >
        {author}
      </p>
    </button>
  );
}
