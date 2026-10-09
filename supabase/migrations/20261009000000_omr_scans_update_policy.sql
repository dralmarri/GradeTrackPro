-- Allow a professor to correct the answers (and re-grade) of their own
-- archived scans from the scan history.
DROP POLICY IF EXISTS "Users manage own scans update" ON public.omr_scans;
CREATE POLICY "Users manage own scans update"
  ON public.omr_scans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
