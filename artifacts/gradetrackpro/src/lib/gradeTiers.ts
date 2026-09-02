export interface GradeTier {
  emoji: string;
  label?: string;
  minPercent: number;
  color: string;
}

export interface LetterTier {
  letter: string;
  minPercent: number;
  color: string;
}

export const DEFAULT_TIERS: GradeTier[] = [
  { emoji: "🤩", label: "ممتاز مرتفع", minPercent: 95, color: "text-success" },
  { emoji: "😍", label: "ممتاز", minPercent: 90, color: "text-success" },
  { emoji: "😄", label: "جيد جداً مرتفع", minPercent: 86, color: "text-primary" },
  { emoji: "😊", label: "جيد جداً", minPercent: 83, color: "text-primary" },
  { emoji: "🙂", label: "جيد جداً منخفض", minPercent: 80, color: "text-primary" },
  { emoji: "😌", label: "جيد مرتفع", minPercent: 75, color: "text-accent" },
  { emoji: "😐", label: "جيد", minPercent: 70, color: "text-accent" },
  { emoji: "😕", label: "جيد منخفض", minPercent: 66, color: "text-accent" },
  { emoji: "😟", label: "مقبول مرتفع", minPercent: 63, color: "text-warning" },
  { emoji: "😣", label: "مقبول", minPercent: 60, color: "text-warning" },
  { emoji: "😢", label: "راسب", minPercent: 0, color: "text-destructive" },
];


// سلم درجات الحروف الصحيح (الفصل الأول 2006-2007 وما بعده)
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

const KEY = "gradeTiers.v4";
const LETTER_KEY = "letterTiers.v2";

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
  const safePct = Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0;
  const sorted = [...tiers].sort((a, b) => b.minPercent - a.minPercent);
  for (const t of sorted) if (safePct >= t.minPercent) return t;
  return sorted[sorted.length - 1];
}

export function getLetterFor(pct: number, tiers: LetterTier[] = loadLetterTiers()): LetterTier {
  const safePct = Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0;
  const sorted = [...tiers].sort((a, b) => b.minPercent - a.minPercent);
  for (const t of sorted) if (safePct >= t.minPercent) return t;
  return sorted[sorted.length - 1];
}
