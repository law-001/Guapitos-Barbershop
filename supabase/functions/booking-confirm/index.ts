// booking-confirm — sends the customer a styled booking-confirmation email.
//
// Why server-side: sending email needs a SECRET provider key (Resend). The
// browser must never hold that key, so — like staff-login — this lives in an
// Edge Function. The client only sends already-formatted display strings; this
// function just drops them into the HTML and hands it to Resend.
//
// The HTML copies the magic-link email's look: dark warm card, tan accent,
// cream text. It lists every booking detail and adds Reschedule / Cancel
// buttons that deep-link back into the app (?b=<id>&do=reschedule|cancel),
// which App.jsx reads on load.
//
// Env (set as function secrets — NOT VITE_ vars, they are server-only):
//   RESEND_API_KEY  — Resend API key            (required)
//   EMAIL_FROM      — verified sender, e.g.
//                     "Guapito's Barbershop <noreply@yourdomain.com>" (required)
//   APP_URL         — public site URL for the action links,
//                     e.g. https://guapitos.example  (required)
// Deploy:  supabase functions deploy booking-confirm
//   secrets: supabase secrets set RESEND_API_KEY=... EMAIL_FROM=... APP_URL=...

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? "";
const APP_URL = (Deno.env.get("APP_URL") ?? "").replace(/\/$/, "");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// Minimal HTML escape so customer-entered text (name, notes) can't break markup.
const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// One label/value line in the details block.
const row = (label: string, value: string) => `
  <tr>
    <td style="padding:7px 0;color:#9A9388;font-size:13px;text-align:left">${esc(label)}</td>
    <td style="padding:7px 0;color:#F4EFE7;font-size:13px;font-weight:bold;text-align:right">${esc(value)}</td>
  </tr>`;

function buildHtml(p: Record<string, string>) {
  // Carry the account email so the app can re-sign-in the right person if their
  // session has lapsed by the time they click (e.g. on their phone later).
  const e = p.customerEmail ? `&e=${encodeURIComponent(p.customerEmail)}` : "";
  const reschedUrl = `${APP_URL}/?b=${encodeURIComponent(p.bookingId)}&do=reschedule${e}`;
  const cancelUrl = `${APP_URL}/?b=${encodeURIComponent(p.bookingId)}&do=cancel${e}`;
  const notesRow = p.notes ? row("Notes", p.notes) : "";
  return `
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0E0E0E;padding:32px 0;font-family:Arial,Helvetica,sans-serif">
  <tr>
    <td align="center">
      <table width="440" cellpadding="0" cellspacing="0" style="max-width:440px;width:100%;background:#15130F;border:1px solid #2A2622;border-radius:16px;padding:36px 28px">
        <tr>
          <td align="center">
            <p style="margin:0 0 6px;color:#D6C3A0;font-size:13px;letter-spacing:2px;text-transform:uppercase;font-weight:bold">Guapito's Barbershop</p>
            <h1 style="margin:0 0 8px;color:#F4EFE7;font-size:24px;font-weight:bold">Booking confirmed ✂️</h1>
            <p style="margin:0 0 24px;color:#9A9388;font-size:14px;line-height:1.5">Thanks${p.customer ? ", " + esc(p.customer) : ""}! Your appointment is locked in. Reference <strong style="color:#D6C3A0">${esc(p.ref)}</strong>.</p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0E0E0E;border:1px solid #2A2622;border-radius:12px;padding:8px 18px;margin:0 0 26px">
              ${row("Service", p.service)}
              ${row("Date", p.dateLabel)}
              ${row("Time", p.timeLabel)}
              ${row("Duration", p.durLabel)}
              ${row("Barber", p.barberName)}
              ${row("Payment", p.payLabel)}
              ${row("Total", p.priceLabel)}
              ${notesRow}
            </table>

            <table cellpadding="0" cellspacing="0" style="margin:0 auto">
              <tr>
                <td style="padding:0 6px">
                  <a href="${reschedUrl}" style="display:inline-block;background:#D6C3A0;color:#0E0E0E;font-size:14px;font-weight:bold;text-decoration:none;padding:12px 22px;border-radius:10px">Reschedule</a>
                </td>
                <td style="padding:0 6px">
                  <a href="${cancelUrl}" style="display:inline-block;background:#0E0E0E;color:#C46A5A;font-size:14px;font-weight:bold;text-decoration:none;padding:12px 22px;border-radius:10px;border:1px solid #C46A5A">Cancel booking</a>
                </td>
              </tr>
            </table>

            <p style="margin:24px 0 0;color:#9A9388;font-size:13px;line-height:1.5">Need to change something? Use the buttons above any time before your slot.</p>
          </td>
        </tr>
      </table>
      <p style="margin:18px 0 0;color:#5A554E;font-size:12px">Guapito's Barbershop · See you in the chair ✂️</p>
    </td>
  </tr>
</table>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ result: "error", message: "Method not allowed." }, 405);

  if (!RESEND_API_KEY || !EMAIL_FROM) {
    return json({ result: "error", message: "Email is not configured (RESEND_API_KEY / EMAIL_FROM)." }, 500);
  }

  try {
    const p = await req.json().catch(() => ({}));
    const to = String(p.to ?? "").trim();
    if (!to) return json({ result: "error", message: "Recipient email is required." });

    const html = buildHtml(p);

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [to],
        subject: `Booking confirmed — ${p.dateLabel ?? ""} ${p.timeLabel ?? ""} (${p.ref ?? ""})`.trim(),
        html,
      }),
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) return json({ result: "error", message: body?.message ?? "Email send failed." }, 502);

    return json({ result: "ok", id: body?.id ?? null });
  } catch (e) {
    return json({ result: "error", message: String((e as Error)?.message ?? e) }, 500);
  }
});
