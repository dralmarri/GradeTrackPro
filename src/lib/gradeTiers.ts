export interface GradeTier {
  emoji: string;
  minPercent: number;
  color: string;
}

export interface LetterTier {
  letter: string;
  minPercent: number;
  color: string;
}

export const DEFAULT_TIERS: GradeTier[] = [
  { emoji: "🤩", minPercent: 90, color: "text-success" },
  { emoji: "😄", minPercent: 80, color: "text-primary" },
  { emoji: "🙂", minPercent: 70, color: "text-accent" },
  { emoji: "😐", minPercent: 60, color: "text-warning" },
  { emoji: "😠", minPercent: 0, color: "text-destructive" },
];

// سلم درجات الحروف (جامعة الكويت — الفصل الأول 2006-2007 وما بعده)
export const DEFAULT_LETTER_TIERS: LetterTier[] = [
  { letter: "A", minPercent: 95, color: "text-success" },
  { letter: "A-", minPercent: 90, color: "text-success" },
  { letter: "B+", minPercent: 86, color: "text-primary" },
  { letter: "B", minPercent: 83, color: "text-primary" },
  { letter: "B-", minPercent: 80, color: "text-primary" },
  { letter: "C+", minPercent: 75, color: "text-accent" },
  { letter: "C", minPercent: 70, color: "text-accent" },
  { letter: "C-", minPercent: 66, color: "text-accent" },
  { letter: "D+", minPercent: 63, color: "text-warning" },
  { letter: "D", minPercent: 60, color: "text-warning" },
  { letter: "F", minPercent: 0, color: "text-destructive" },
];

const KEY = "gradeTiers.v2";
const LETTER_KEY = "letterTiers.v1";

export function loadGradeTiers(): GradeTier[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_TIERS;
    const parsed = JSON.parse(raw) as GradeTier[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_TIERS;
    return parsed;
  } catch {
    return DEFAULT_TIERS;
  }
}

export function saveGradeTiers(tiers: GradeTier[]) {
  localStorage.setItem(KEY, JSON.stringify(tiers));
  window.dispatchEvent(new Event("gradeTiersChanged"));
}

export function loadLetterTiers(): LetterTier[] {
  try {
    const raw = localStorage.getItem(LETTER_KEY);
    if (!raw) return DEFAULT_LETTER_TIERS;
    const parsed = JSON.parse(raw) as LetterTier[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_LETTER_TIERS;
    return parsed;
  } catch {
    return DEFAULT_LETTER_TIERS;
  }
}

export function saveLetterTiers(tiers: LetterTier[]) {
  localStorage.setItem(LETTER_KEY, JSON.stringify(tiers));
  window.dispatchEvent(new Event("gradeTiersChanged"));
}

export function getTierFor(pct: number, tiers: GradeTier[] = loadGradeTiers()): GradeTier {
  const sorted = [...tiers].sort((a, b) => b.minPercent - a.minPercent);
  for (const t of sorted) if (pct >= t.minPercent) return t;
  return sorted[sorted.length - 1];
}

export function getLetterFor(pct: number, tiers: LetterTier[] = loadLetterTiers()): LetterTier {
  const sorted = [...tiers].sort((a, b) => b.minPercent - a.minPercent);
  for (const t of sorted) if (pct >= t.minPercent) return t;
  return sorted[sorted.length - 1];
}
