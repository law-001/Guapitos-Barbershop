// staff-login — server-side staff login with progressive brute-force throttling.
//
// Why this exists: the browser must NOT be trusted to enforce login lockouts (a
// custom client could just call Supabase Auth directly and never report its
// failures). This function is the only path the app uses to sign in staff. It:
//   1. reads the real client IP from x-forwarded-for,
//   2. checks the DB throttle for the email AND the IP (login_throttle_check),
//   3. if locked, refuses without touching Auth,
//   4. otherwise attempts the password grant against GoTrue,
//   5. on failure records the attempt (login_throttle_fail → progressive lockout),
//   6. on success clears the email throttle and returns the session tokens.
//
// It always responds 200 with a { result } body so the browser can read the
// outcome uniformly (locked / invalid / ok / error).
//
// Env (auto-injected by Supabase): SUPABASE_URL, SUPABASE_ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY. Deploy:  supabase functions deploy staff-login

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Admin client (service_role) — bypasses RLS and may run the throttle helpers.
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const checkKey = async (key: string) => {
  const { data } = await admin.rpc("login_throttle_check", { p_key: key });
  return data ?? { locked: false, retry_after: 0 };
};
const failKey = async (key: string) => {
  const { data } = await admin.rpc("login_throttle_fail", { p_key: key });
  return data ?? { locked: false, retry_after: 0, attempts_left: 0 };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ result: "error", message: "Method not allowed." }, 405);

  try {
    const { email, password } = await req.json().catch(() => ({}));
    const addr = String(email ?? "").trim().toLowerCase();
    if (!addr || !password) return json({ result: "error", message: "Email and password are required." });

    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    const emailKey = `email:${addr}`;
    const ipKey = `ip:${ip}`;

    // 1) Already locked? Don't even hit Auth.
    const [ec, ic] = await Promise.all([checkKey(emailKey), checkKey(ipKey)]);
    if (ec.locked || ic.locked) {
      return json({ result: "locked", retry_after: Math.max(ec.retry_after ?? 0, ic.retry_after ?? 0) });
    }

    // 2) Attempt the password grant server-side.
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON_KEY },
      body: JSON.stringify({ email: addr, password }),
    });
    const body = await resp.json().catch(() => ({}));

    if (!resp.ok || !body.access_token) {
      // 3) Failed login → record against both keys, apply progressive lockout.
      const [ef, iff] = await Promise.all([failKey(emailKey), failKey(ipKey)]);
      const locked = Boolean(ef.locked || iff.locked);
      return json({
        result: locked ? "locked" : "invalid",
        retry_after: Math.max(ef.retry_after ?? 0, iff.retry_after ?? 0),
        attempts_left: Math.min(ef.attempts_left ?? 0, iff.attempts_left ?? 0),
      });
    }

    // 4) Success → clear this email's throttle, hand the session to the client.
    await admin.rpc("login_throttle_clear", { p_key: emailKey });
    return json({ result: "ok", access_token: body.access_token, refresh_token: body.refresh_token });
  } catch (e) {
    return json({ result: "error", message: String((e as Error)?.message ?? e) }, 500);
  }
});
