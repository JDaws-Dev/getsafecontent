"use client";

import { useState } from "react";

// Badge definitions mirrored from convex/readingStreaks.ts
const BADGE_DEFINITIONS: Record<
  string,
  { name: string; emoji: string; description: string }
> = {
  first_book: {
    name: "First Book",
    emoji: "\uD83D\uDCD6",
    description: "Finished your first book!",
  },
  bookworm_5: {
    name: "Bookworm",
    emoji: "\uD83D\uDC1B",
    description: "Finished 5 books",
  },
  bookworm_10: {
    name: "Super Reader",
    emoji: "\uD83C\uDF1F",
    description: "Finished 10 books",
  },
  streak_3: {
    name: "On a Roll",
    emoji: "\uD83D\uDD25",
    description: "3-day reading streak",
  },
  streak_7: {
    name: "Week Warrior",
    emoji: "\u26A1",
    description: "7-day reading streak",
  },
  streak_30: {
    name: "Reading Machine",
    emoji: "\uD83C\uDFC6",
    description: "30-day reading streak",
  },
  speed_reader: {
    name: "Speed Reader",
    emoji: "\uD83D\uDE80",
    description: "Finished a book in one day",
  },
  explorer: {
    name: "Genre Explorer",
    emoji: "\uD83D\uDDFA\uFE0F",
    description: "Read books from 3+ genres",
  },
};

const ALL_BADGE_IDS = [
  "first_book",
  "bookworm_5",
  "bookworm_10",
  "streak_3",
  "streak_7",
  "streak_30",
  "speed_reader",
  "explorer",
];

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  todayMinutes: number;
  todayGoalMet: boolean;
  goalMinutes: number;
  last7Days: Array<{
    date: string;
    minutesRead: number;
    goalMet: boolean;
  }>;
}

interface Badge {
  badgeId: string;
  name: string;
  emoji: string;
  description: string;
  earnedAt: number;
}

interface ReadingStreaksProps {
  streak: StreakData | undefined;
  badges: Badge[] | undefined;
  kidColor: string;
}

const COLOR_MAP: Record<string, { ring: string; bg: string; text: string; progressBg: string; progress: string }> = {
  red: { ring: "ring-red-200", bg: "bg-red-50", text: "text-red-600", progressBg: "bg-red-100", progress: "bg-red-500" },
  blue: { ring: "ring-blue-200", bg: "bg-blue-50", text: "text-blue-600", progressBg: "bg-blue-100", progress: "bg-blue-500" },
  green: { ring: "ring-emerald-200", bg: "bg-emerald-50", text: "text-emerald-600", progressBg: "bg-emerald-100", progress: "bg-emerald-500" },
  purple: { ring: "ring-purple-200", bg: "bg-purple-50", text: "text-purple-600", progressBg: "bg-purple-100", progress: "bg-purple-500" },
  orange: { ring: "ring-orange-200", bg: "bg-orange-50", text: "text-orange-600", progressBg: "bg-orange-100", progress: "bg-orange-500" },
  pink: { ring: "ring-pink-200", bg: "bg-pink-50", text: "text-pink-600", progressBg: "bg-pink-100", progress: "bg-pink-500" },
  teal: { ring: "ring-teal-200", bg: "bg-teal-50", text: "text-teal-600", progressBg: "bg-teal-100", progress: "bg-teal-500" },
  yellow: { ring: "ring-amber-200", bg: "bg-amber-50", text: "text-amber-600", progressBg: "bg-amber-100", progress: "bg-amber-500" },
};

export function ReadingStreaks({ streak, badges, kidColor }: ReadingStreaksProps) {
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);

  const colors = COLOR_MAP[kidColor] || COLOR_MAP.purple;
  const earnedIds = new Set((badges || []).map((b) => b.badgeId));

  if (!streak) return null;

  const progressPercent = Math.min(
    (streak.todayMinutes / streak.goalMinutes) * 100,
    100
  );

  return (
    <div className="space-y-3">
      {/* Streak + Today's Progress Card */}
      <div className={`rounded-2xl ${colors.bg} p-4 shadow-sm ring-1 ${colors.ring}`}>
        <div className="flex items-center justify-between">
          {/* Current streak */}
          <div className="flex items-center gap-2">
            {streak.currentStreak > 0 ? (
              <>
                <span className="text-2xl">{"\uD83D\uDD25"}</span>
                <div>
                  <p className={`text-lg font-bold ${colors.text}`}>
                    {streak.currentStreak} day{streak.currentStreak !== 1 ? "s" : ""}
                  </p>
                  <p className="text-[10px] font-medium text-gray-400">
                    reading streak
                  </p>
                </div>
              </>
            ) : (
              <>
                <span className="text-2xl">{"\uD83D\uDCDA"}</span>
                <div>
                  <p className="text-sm font-bold text-gray-700">
                    Start a streak!
                  </p>
                  <p className="text-[10px] font-medium text-gray-400">
                    Read {streak.goalMinutes} min to begin
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Longest streak (if > current) */}
          {streak.longestStreak > streak.currentStreak &&
            streak.longestStreak > 0 && (
              <div className="text-right">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                  Best
                </p>
                <p className="text-sm font-bold text-gray-600">
                  {streak.longestStreak}d
                </p>
              </div>
            )}
        </div>

        {/* Today's progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] font-medium text-gray-500">
            <span>Today: {Math.round(streak.todayMinutes)} min</span>
            <span>{streak.goalMinutes} min goal</span>
          </div>
          <div className={`mt-1 h-2.5 w-full overflow-hidden rounded-full ${colors.progressBg}`}>
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${colors.progress}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {streak.todayGoalMet && (
            <p className={`mt-1.5 text-center text-[11px] font-bold ${colors.text}`}>
              Goal reached! {"\u2705"}
            </p>
          )}
        </div>

        {/* Weekly dots */}
        <div className="mt-3 flex items-center justify-between px-1">
          {streak.last7Days.map((day, i) => {
            // Get day-of-week label for this date
            const d = new Date(day.date + "T12:00:00");
            const dayLabel = ["S", "M", "T", "W", "T", "F", "S"][d.getDay()];
            const isToday = day.date === streak.last7Days[streak.last7Days.length - 1]?.date;

            return (
              <div key={day.date} className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    day.goalMet
                      ? `${colors.progress} text-white shadow-sm`
                      : day.minutesRead > 0
                        ? `${colors.progressBg} ${colors.text}`
                        : isToday
                          ? "bg-gray-200 text-gray-400 ring-2 ring-gray-300"
                          : "bg-gray-100 text-gray-300"
                  }`}
                  title={`${day.date}: ${day.minutesRead} min`}
                >
                  {day.goalMet ? "\u2713" : day.minutesRead > 0 ? Math.round(day.minutesRead) : ""}
                </div>
                <span className={`text-[9px] font-medium ${isToday ? "text-gray-600" : "text-gray-400"}`}>
                  {dayLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Badge Shelf */}
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-base">{"\uD83C\uDFC5"}</span>
            <h3 className="font-display text-sm font-bold text-brand-navy">My Badges</h3>
          </div>
          <span className="text-[10px] font-semibold text-gray-400">
            {earnedIds.size}/{ALL_BADGE_IDS.length}
          </span>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto overscroll-contain pb-1 scrollbar-none">
          {ALL_BADGE_IDS.map((badgeId) => {
            const earned = earnedIds.has(badgeId);
            const def = BADGE_DEFINITIONS[badgeId];
            const isSelected = selectedBadge === badgeId;

            return (
              <button
                key={badgeId}
                onClick={() =>
                  setSelectedBadge(isSelected ? null : badgeId)
                }
                className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-xl transition-all ${
                  earned
                    ? `bg-gradient-to-br from-amber-50 to-yellow-100 shadow-sm ring-1 ring-amber-200 hover:shadow-md active:scale-95`
                    : "bg-gray-100 text-gray-300 ring-1 ring-gray-200"
                }`}
                title={earned ? def.name : "Locked"}
              >
                {earned ? def.emoji : "\uD83D\uDD12"}
              </button>
            );
          })}
        </div>

        {/* Badge tooltip / detail */}
        {selectedBadge && (
          <div className="mt-2 rounded-xl bg-gray-50 px-3 py-2.5 text-center">
            <p className="text-sm font-bold text-gray-800">
              {BADGE_DEFINITIONS[selectedBadge]?.emoji}{" "}
              {BADGE_DEFINITIONS[selectedBadge]?.name}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              {BADGE_DEFINITIONS[selectedBadge]?.description}
            </p>
            {earnedIds.has(selectedBadge) ? (
              <p className="mt-1 text-[10px] font-medium text-emerald-600">
                Earned{" "}
                {new Date(
                  (badges || []).find((b) => b.badgeId === selectedBadge)
                    ?.earnedAt ?? 0
                ).toLocaleDateString()}
              </p>
            ) : (
              <p className="mt-1 text-[10px] font-medium text-gray-400">
                Keep reading to unlock!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
