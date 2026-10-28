import { z } from "zod";

export const leadSchema = z.object({
  name: z.string().trim().min(1).max(180),
  email: z.string().trim().email().max(320).or(z.literal("")).default(""),
  phone: z.string().trim().max(40).default(""),
  origin: z.string().trim().max(500).default(""),
  destination: z.string().trim().max(500).default(""),
  moveDate: z.string().trim().max(40).default(""),
  moveSize: z.string().trim().max(100).default(""),
  message: z.string().trim().max(5000).default(""),
});
export type Lead = z.infer<typeof leadSchema>;

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), v => v.toString(16).padStart(2, "0")).join("");
}

const MATCHERS: [keyof Lead, RegExp][] = [
  ["email", /e-?mail/i],
  ["phone", /phone|mobile|tel/i],
  ["origin", /pick.?up|origin|from|moving.?from|current.?address/i],
  ["destination", /drop.?off|destination|deliver|moving.?to|\bto\b|new.?address/i],
  ["moveDate", /date|when/i],
  ["moveSize", /size|bedroom|rooms|home.?type/i],
  ["message", /message|notes?|comments?|details|description/i],
  ["name", /name/i],
];

/** Flattens any form-builder payload into label → value pairs. */
function pairs(input: unknown): [string, string][] {
  const out: [string, string][] = [];
  const obj = input as Record<string, any>;
  // Typeform: form_response.answers with field ids, titles in definition.fields
  const tf = obj?.form_response;
  if (tf?.answers && Array.isArray(tf.answers)) {
    const titles = new Map<string, string>((tf.definition?.fields ?? []).map((f: any) => [f.id, f.title || f.ref || ""]));
    for (const a of tf.answers) {
      const label = `${titles.get(a.field?.id) ?? ""} ${a.field?.ref ?? ""} ${a.type === "email" ? "email" : a.type === "phone_number" ? "phone" : a.type === "date" ? "date" : ""}`;
      const value = a.email ?? a.phone_number ?? a.text ?? a.date ?? a.number ?? a.choice?.label ?? a.choices?.labels?.join(", ") ?? a.url;
      if (value != null) out.push([label, String(value)]);
    }
    return out;
  }
  // Jotform sends the answers as JSON in rawRequest
  if (typeof obj?.rawRequest === "string") {
    try { return pairs(JSON.parse(obj.rawRequest)); } catch { /* fall through */ }
  }
  const walk = (value: unknown, path: string) => {
    if (value == null) return;
    if (typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>);
      // Name objects like { first, last }
      if (entries.every(([, v]) => typeof v === "string") && entries.some(([k]) => /first|last/i.test(k))) {
        out.push([path, entries.map(([, v]) => v).join(" ").trim()]);
        return;
      }
      for (const [k, v] of entries) walk(v, `${path} ${k}`);
      return;
    }
    out.push([path, String(value)]);
  };
  walk(input, "");
  return out;
}

export function normalizeLead(input: unknown): Lead | null {
  const lead: Record<string, string> = {};
  const extra: string[] = [];
  for (const [label, value] of pairs(input)) {
    const v = value.trim();
    if (!v) continue;
    const key = label.replace(/^q\d+_/, "");
    const match = MATCHERS.find(([, re]) => re.test(key));
    if (match && !lead[match[0]]) lead[match[0]] = v.slice(0, 5000);
    else if (extra.length < 30 && !/^(?:form_?id|submission_?id|ip|event|token|signature)/i.test(key.trim())) extra.push(`${key.trim()}: ${v.slice(0, 200)}`);
  }
  if (!lead.name && lead.email) lead.name = lead.email.split("@")[0];
  if (lead.email && !z.string().email().safeParse(lead.email).success) delete lead.email;
  if (extra.length) lead.message = [lead.message, ...extra].filter(Boolean).join("\n").slice(0, 5000);
  const parsed = leadSchema.safeParse(lead);
  return parsed.success ? parsed.data : null;
}

export async function saveLead(credential: string, requestId: string, lead: Lead) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const notes = [
    lead.moveDate && `Move date: ${lead.moveDate}`,
    lead.origin && `Pickup: ${lead.origin}`,
    lead.destination && `Delivery: ${lead.destination}`,
    lead.moveSize && `Move size: ${lead.moveSize}`,
    lead.message,
  ].filter(Boolean).join("\n");
  const { error } = await supabaseAdmin.rpc("receive_integration_lead", {
    _hash: await sha256(credential), _request_id: requestId, _data: { ...lead, notes },
  });
  if (!error) return 201;
  if (error.message.includes("credential")) return 401;
  if (error.message.includes("rate limit")) return 429;
  if (error.message.includes("Invalid quote")) return 400;
  console.error("Lead intake failed:", error.message);
  return 503;
}
