"use client";

/**
 * Named icons for the kid screens. House rule: no emoji anywhere on the
 * sites, so avatars, badges, and section markers are lucide SVGs (the same
 * icon set every other screen in the app uses) keyed by a plain string.
 *
 * The backend sends badge icons as one of these keys (convex/readingStreaks.ts
 * BADGE_DEFINITIONS); the client maps the key to a component here.
 */

import {
  Bird,
  BookOpen,
  Bug,
  Cat,
  Fish,
  Flame,
  Lock,
  Map,
  Medal,
  Rabbit,
  Rocket,
  Star,
  Trophy,
  Zap,
  type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";

type IconComponent = ComponentType<LucideProps>;

/** One playful icon per profile color. */
const AVATAR_ICONS: Record<string, IconComponent> = {
  red: Flame,
  blue: Rocket,
  green: Bird,
  purple: Star,
  orange: Cat,
  pink: Rabbit,
  teal: Fish,
  yellow: Zap,
};

export function AvatarIcon({ color, className }: { color: string; className?: string }) {
  const Icon = AVATAR_ICONS[color] ?? Star;
  return <Icon className={className} strokeWidth={2.25} aria-hidden="true" />;
}

/** Badge icon keys the server may send. Unknown keys fall back to a medal. */
export type BadgeIconKey =
  | "book"
  | "bug"
  | "star"
  | "flame"
  | "zap"
  | "trophy"
  | "rocket"
  | "map"
  | "medal";

const BADGE_ICONS: Record<BadgeIconKey, IconComponent> = {
  book: BookOpen,
  bug: Bug,
  star: Star,
  flame: Flame,
  zap: Zap,
  trophy: Trophy,
  rocket: Rocket,
  map: Map,
  medal: Medal,
};

export function BadgeIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = BADGE_ICONS[icon as BadgeIconKey] ?? Medal;
  return <Icon className={className} strokeWidth={2.25} aria-hidden="true" />;
}

export function LockedBadgeIcon({ className }: { className?: string }) {
  return <Lock className={className} strokeWidth={2.25} aria-hidden="true" />;
}
