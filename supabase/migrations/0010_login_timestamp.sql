-- 0010_login_timestamp.sql — record each customer's last successful sign-in.
-- Forward-only. Apply in the Supabase SQL Editor after 0009.
--
-- Drives the absolute session-lifetime policy: the app stamps this column on
-- every successful sign-in and, on startup / protected-page access / periodic
-- checks, signs the user out once (now - login_timestamp) exceeds the configured
-- maximum (VITE_SESSION_MAX_HOURS, default 24h). Because the cutoff is computed
-- from this server-stored value, the clock keeps running while the browser is
-- closed and a plain page refresh never resets it.
--
-- Nullable: rows that predate this column stay null until their next sign-in,
-- and a null timestamp is treated as "not yet expired" (never locks anyone out).

alter table public.users add column if not exists login_timestamp timestamptz;
