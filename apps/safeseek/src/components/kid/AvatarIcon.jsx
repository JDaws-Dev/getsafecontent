import { Flame, Cat, Zap, Bird, Rocket, Star, Sparkles, PawPrint, Fish, Leaf } from 'lucide-react';

// Personality icon per profile color. Inline SVG (lucide) — no emoji anywhere
// in the product, per the Safe Family brand rules.
const AVATAR_COMPONENTS = {
  red: Flame,
  orange: Cat,
  yellow: Zap,
  green: Bird,
  blue: Rocket,
  purple: Star,
  pink: Sparkles,
  gray: PawPrint,
  cyan: Fish,
  teal: Leaf,
};

export default function AvatarIcon({ color, className = 'w-6 h-6' }) {
  const Icon = AVATAR_COMPONENTS[color] || AVATAR_COMPONENTS.blue;
  return <Icon className={className} strokeWidth={2} aria-hidden="true" />;
}
