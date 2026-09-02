// Scheduled (cron) function — NOT called by the app itself, so it runs
// automatically for every professor's data without depending on anyone
// remembering to clean up storage manually. Set up as a scheduled Edge
// Function in the Supabase dashboard (see the deployment note in the repo).
//
// Deletes archived answer-sheet PHOTOS older than RETENTION_MONTHS, across
// ALL users, and clears the matching omr_scans.image_path. It never touches
// the score, answers, or student name on the row — those were already
// applied to the gradebook the moment each sheet was scanned, so removing
// the photo well after a semester ends can't affect anyone's grades.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RETENTION_MONTHS = 6;
const BATCH_SIZE = 500; // storage.remove() and .in() both handle large lists fine, but keep batches sane

Deno.serve(async (req) => {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - RETENTION_MONTHS);

    let totalDeleted = 0;
    // Loop in batches in case a project has accumulated a large backlog
    // before this job was first set up.
    while (true) {
      const { data: scans, error: selErr } = await admin
        .from("omr_scans")
        .select("id, image_path")
        .not("image_path", "is", null)
        .lt("created_at", cutoff.toISOString())
        .limit(BATCH_SIZE);

      if (selErr) throw selErr;
      if (!scans || scans.length === 0) break;

      const paths = scans.map((s) => s.image_path as string).filter(Boolean);
      const ids = scans.map((s) => s.id);

      if (paths.length > 0) {
        const { error: rmErr } = await admin.storage.from("scans").remove(paths);
        // If the storage removal fails, don't null out image_path for this
        // batch — better to retry next run than to lose the pointer to a
        // file that's actually still there.
        if (rmErr) {
          console.error("Storage remove failed for batch:", rmErr);
          break;
        }
      }

      const { error: updErr } = await admin
        .from("omr_scans")
        .update({ image_path: null })
        .in("id", ids);
      if (updErr) throw updErr;

      totalDeleted += paths.length;
      if (scans.length < BATCH_SIZE) break; // last batch
    }

    return new Response(JSON.stringify({ success: true, deleted: totalDeleted, retentionMonths: RETENTION_MONTHS }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("purge-scan-archive failed:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
