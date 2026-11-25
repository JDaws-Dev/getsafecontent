import { Flame, Cat, Zap, Bird, Rocket, Star, Sparkles, PawPrint, Fish, Leaf } from 'lucide-react';

// One icon per profile colour, the same mapping SafeStudy uses
// (apps/safeseek/src/components/kid/AvatarIcon.jsx) so a kid looks the same
// in every Safe Family picker. Inline SVG, no emoji.
const AVATAR_COMPONENTS = {
  red: Flame,
  orange: Cat,
  yellow: Zap,
  green: Bird,
  blue: Rocket,
  indigo: Rocket,
  purple: Star,
  pink: Sparkles,
  gray: PawPrint,
  cyan: Fish,
  teal: Leaf,
};

export default function KidAvatarIcon({ color, className = 'w-6 h-6' }) {
  const Icon = AVATAR_COMPONENTS[color] || Star;
  return <Icon className={className} strokeWidth={2} aria-hidden="true" />;
}
