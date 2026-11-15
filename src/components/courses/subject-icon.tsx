import {
  BookOpen,
  Brain,
  Castle,
  FlaskConical,
  Globe,
  IndianRupee,
  Landmark,
  Leaf,
  Mountain,
  Newspaper,
  Palette,
  Rocket,
  Scale,
  Scroll,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  'rajasthan-history': Castle,
  'rajasthan-geography': Mountain,
  'rajasthan-polity': Landmark,
  'rajasthan-economy': IndianRupee,
  'rajasthan-art-culture': Palette,
  'indian-history': Scroll,
  'indian-polity': Scale,
  'indian-geography': Globe,
  'indian-economy': TrendingUp,
  'general-science': FlaskConical,
  'science-technology': Rocket,
  'environment-ecology': Leaf,
  reasoning: Brain,
  'current-affairs': Newspaper,
};

export function SubjectIcon({ slug, className = 'h-5 w-5' }: { slug: string; className?: string }) {
  const Icon = ICONS[slug] ?? BookOpen;
  return <Icon className={className} aria-hidden="true" />;
}
