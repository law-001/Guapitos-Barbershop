-- 0014_reviews_delete_policy.sql — allow deleting reviews.
-- Forward-only. Apply in the Supabase SQL Editor after 0013.
--
-- The admin Reviews page "Reject"/"Remove" action deletes the row, but RLS had
-- no DELETE policy, so deletes were silently blocked (0 rows affected, no error).
--
-- This policy permits deletes at the DB level. It can't yet be scoped to staff:
-- the admin is a client-side login (manager/guapito), not a Supabase Auth
-- session, so Postgres has no "staff" identity to check against. When staff auth
-- is wired for production, replace this with a staff-only policy, e.g.:
--   create policy "reviews delete" on public.reviews for delete
--     using (auth.jwt() ->> 'role' = 'staff');

create policy "reviews delete" on public.reviews for delete using (true);
