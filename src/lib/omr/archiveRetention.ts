// Keep this in sync with RETENTION_MONTHS in
// supabase/functions/purge-scan-archive/index.ts — the scheduled job that
// actually deletes the photos. This file only computes "how long is left"
// so the UI can warn the professor before that happens; it doesn't delete
// anything itself.
export const RETENTION_MONTHS = 6;

export function daysUntilPurge(createdAtIso: string): number {
  const created = new Date(createdAtIso);
  const purgeDate = new Date(created);
  purgeDate.setMonth(purgeDate.getMonth() + RETENTION_MONTHS);
  const ms = purgeDate.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

// Warn starting a month out — enough time to notice and download before
// the scheduled job removes the photo.
export const PURGE_WARNING_DAYS = 30;
