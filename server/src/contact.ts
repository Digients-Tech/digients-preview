// Dataset-access request handling. Form submissions from the portal are emailed
// to CONTACT_EMAIL (default: contact@digients.tech) via Resend. The submitter's
// own email lands in reply_to so the team replies straight to them from Gmail.

import { Resend } from "resend";

export type RequestPayload = {
  fullName: string;
  organization: string;
  email: string;
  role: string;
  country: string;
  useCase: string;
  estimatedScale?: string;
  ndaRequired?: boolean;
};

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM ?? "Digients Preview <noreply@mail.digients.tech>";
const CONTACT_EMAIL = process.env.CONTACT_EMAIL ?? "contact@digients.tech";
// Team distribution list — cc'd on every submission so the whole team sees
// inbound interest. One Resend send = one billed email regardless of how many
// to/cc/bcc recipients, so this stays in the 100/day free tier.
const CONTACT_CC = (process.env.CONTACT_CC ??
  "shawn@digients.tech,dylanliang@digients.tech,jasonwang@digients.tech")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!RESEND_API_KEY) {
  console.warn("[contact] RESEND_API_KEY not set — /api/request-access will fail with 503 until it's configured");
}

let resend: Resend | null = null;
function client(): Resend | null {
  if (!RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(RESEND_API_KEY);
  return resend;
}

// Trim + sanity-check a form body coming from the wire. Returns the cleaned
// payload, or a short error message string that's safe to surface to the user.
export function validatePayload(body: unknown): RequestPayload | string {
  if (!body || typeof body !== "object") return "invalid body";
  const o = body as Record<string, unknown>;
  const required = ["fullName", "organization", "email", "role", "country", "useCase"] as const;
  for (const k of required) {
    const v = o[k];
    if (typeof v !== "string" || !v.trim()) return `missing field: ${k}`;
  }
  const email = (o.email as string).trim();
  // Minimal RFC-5322-ish check — Resend does the heavy lifting on its end.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return "invalid email";
  const cap = (s: string, n: number) => s.trim().slice(0, n);
  return {
    fullName: cap(o.fullName as string, 120),
    organization: cap(o.organization as string, 160),
    email,
    role: cap(o.role as string, 120),
    country: cap(o.country as string, 80),
    useCase: cap(o.useCase as string, 4000),
    estimatedScale: typeof o.estimatedScale === "string" ? cap(o.estimatedScale, 200) : "",
    ndaRequired: !!o.ndaRequired,
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[<>&"']/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" } as Record<string, string>)[c]!
  );
}

function buildHtml(p: RequestPayload): string {
  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 16px 6px 0;color:#555;font-weight:500;vertical-align:top;white-space:nowrap">${escapeHtml(k)}</td><td style="padding:6px 0;color:#111">${escapeHtml(v)}</td></tr>`;
  const emailLink = `<a href="mailto:${escapeHtml(p.email)}" style="color:#111">${escapeHtml(p.email)}</a>`;
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:620px;margin:0 auto;color:#111;font-size:14px;line-height:1.5">
  <h2 style="margin:0 0 18px;font-size:18px;font-weight:600">New dataset request</h2>
  <table cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%">
    ${row("Name", p.fullName)}
    ${row("Organization", p.organization)}
    ${row("Role / Title", p.role)}
    <tr><td style="padding:6px 16px 6px 0;color:#555;font-weight:500;vertical-align:top;white-space:nowrap">Email</td><td style="padding:6px 0">${emailLink}</td></tr>
    ${row("Country / Region", p.country)}
    ${p.estimatedScale ? row("Estimated scale", p.estimatedScale) : ""}
    ${row("NDA required", p.ndaRequired ? "Yes" : "No")}
  </table>
  <h3 style="margin:22px 0 8px;font-size:14px;font-weight:600">Use case</h3>
  <p style="margin:0;white-space:pre-wrap">${escapeHtml(p.useCase)}</p>
  <hr style="border:0;border-top:1px solid #eee;margin:24px 0 12px">
  <p style="font-size:12px;color:#888;margin:0">Submitted via sample.digients.tech. Reply to this email to reach the requester directly.</p>
</div>`;
}

function buildText(p: RequestPayload): string {
  return [
    `Name: ${p.fullName}`,
    `Organization: ${p.organization}`,
    `Role / Title: ${p.role}`,
    `Email: ${p.email}`,
    `Country / Region: ${p.country}`,
    p.estimatedScale ? `Estimated scale: ${p.estimatedScale}` : "",
    `NDA required: ${p.ndaRequired ? "Yes" : "No"}`,
    "",
    "Use case:",
    p.useCase,
    "",
    "—",
    "Submitted via sample.digients.tech. Reply to reach the requester directly.",
  ]
    .filter((l) => l !== "")
    .join("\n");
}

export async function sendRequest(
  p: RequestPayload
): Promise<{ ok: true; id?: string } | { ok: false; error: string; status: number }> {
  const c = client();
  if (!c) return { ok: false, error: "email delivery not configured", status: 503 };
  try {
    const res = await c.emails.send({
      from: RESEND_FROM,
      to: [CONTACT_EMAIL],
      cc: CONTACT_CC.length ? CONTACT_CC : undefined,
      replyTo: p.email,
      subject: `[Sample Portal] Dataset request from ${p.organization}`,
      html: buildHtml(p),
      text: buildText(p),
    });
    if (res.error) {
      console.error("[contact] Resend error:", res.error);
      return { ok: false, error: "delivery failed", status: 502 };
    }
    const id = res.data?.id;
    console.log(`[contact] sent ${id ?? "(no id)"} — ${p.organization} <${p.email}>`);
    return { ok: true, id };
  } catch (e) {
    console.error("[contact] Resend threw:", e);
    return { ok: false, error: "delivery failed", status: 502 };
  }
}
