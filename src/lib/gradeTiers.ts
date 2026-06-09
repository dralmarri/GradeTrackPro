export interface GradeTier {
  emoji: string;
  minPercent: number;
  color: string;
}

export const DEFAULT_TIERS: GradeTier[] = [
  { emoji: "🌟", minPercent: 90, color: "text-success" },
  { emoji: "🏆", minPercent: 80, color: "text-primary" },
  { emoji: "👍", minPercent: 70, color: "text-accent" },
  { emoji: "✅", minPercent: 60, color: "text-warning" },
  { emoji: "❌", minPercent: 0, color: "text-destructive" },
];

const KEY = "gradeTiers.v1";

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

export function getTierFor(pct: number, tiers: GradeTier[] = loadGradeTiers()): GradeTier {
  const sorted = [...tiers].sort((a, b) => b.minPercent - a.minPercent);
  for (const t of sorted) if (pct >= t.minPercent) return t;
  return sorted[sorted.length - 1];
}
