// Core workspace CRM API on Lovable Cloud. Replaces the Manus Express /api/crm router.
// Every request runs as the signed-in user, so database row security applies.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { calculateQuote, DEFAULT_PRICING, type Pricing } from "../shared/crm";
import { conflictsFor, type ScheduledJob } from "../shared/dispatch";
import { fieldRoute } from "./field-api";
import { canTestBook } from '../lib/test-booking';
import { appearanceSchema, parseAppearance, validWallpaperScope } from '../lib/workspace-appearance';
import { pricingSchema, canEditTariffs } from '../shared/workspace-tariffs';
import { operationalReport } from '../shared/workspace-reports';
import { travelSettingsSchema } from '../lib/travel-rules';

export type Ctx = { db: SupabaseClient; userId: string; email: string; wsId: number | null; role: string | null; q?: URLSearchParams; origin?: string };
export type Row = { id: number; data: Record<string, unknown>; created_at: string };

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
const fail = (status: number, message: string): never => {
  throw new HttpError(status, message);
};

const KINDS: Record<string, string> = {
  customers: "customer",
  jobs: "job",
  trucks: "truck",
  crew: "crew",
  reminders: "reminder",
  sequences: "sequence",
};

const DEFAULTS: Record<string, Record<string, unknown>> = {
  customer: { name: "", email: "", phone: "", source: "", score: 0, status: "new", notes: "" },
  job: {
    title: "", moveDate: "", startHour: 8, duration: 4, origin: "", destination: "", originNotes: "",
    destinationNotes: "", moveSize: "", status: "lead", pricingMode: "hourly", crewSize: 2, hourlyRate: 130,
    estimatedHours: 2.5, distanceMiles: 0, travelMinutes: 0, travelFee: 0, weightRate: 0.5, mileRate: 2,
    inventory: [], fees: [], total: 0, truckId: null, crewIds: [], requiredSkill: 1, signature: null,
    clockIn: null, clockOut: null, completedSignature: null, invoiceStatus: "draft", actualHours: null, finalTotal: null,
  },
  truck: { name: "", plate: "", capacityCuft: 0, weightLimit: 0, dimensions: "", status: "available" },
  crew: { userId: null, name: "", email: "", phone: "", isDriver: false, skillLevel: 1, hourlyRate: 0, status: "active" },
  reminder: { customerId: null, title: "", dueAt: "", completed: false },
  sequence: { name: "", trigger: "", channel: "email", delayHours: 0, condition: "", template: "", enabled: false, deliveryStatus: "not_sent" },
};

const toRecord = (r: Row, wsId: number) => ({ ...r.data, id: r.id, tenantId: wsId, createdAt: r.created_at });

async function list(ctx: Ctx, kind: string) {
  const ws = requireWs(ctx);
  const { data, error } = await ctx.db
    .from("workspace_records").select("id,data,created_at")
    .eq("workspace_id", ws).eq("kind", kind).order("id", { ascending: false }).limit(1000);
  if (error) fail(500, error.message);
  return (data as Row[]).map((r) => toRecord(r, ws));
}

async function getOne(ctx: Ctx, kind: string, id: number) {
  const ws = requireWs(ctx);
  const { data, error } = await ctx.db
    .from("workspace_records").select("id,data,created_at")
    .eq("workspace_id", ws).eq("kind", kind).eq("id", id).maybeSingle();
  if (error) fail(500, error.message);
  if (!data) fail(404, "Not found");
  return data as Row;
}

// Fields owned by the server (payments, proposals, derived customer info, account links) are never accepted from requests.
const SERVER_FIELDS = new Set([
  "id", "tenantId", "createdAt", "updatedAt", "workspaceId", "workspace_id",
  "depositPaidCents", "depositPaidAt", "depositPaymentSession", "depositMode", "depositOverride",
  "proposalToken", "customerName", "customerEmail", "customerPhone", "sourceChannel",
  "timeline", "finalPayment", "finalCheckout", "signedOffAt", "billableHours", "finalBill",
  "testApproval",
  "fieldDocuments", "fieldDocumentId", "fieldPdf",
]);
const FIELD_NAME = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;

// Request bodies may only set the fields listed for each record kind (defaults plus these extras).
const EXTRA_FIELDS: Record<string, string[]> = {
  customer: ["company", "address", "tags", "assignedTo", "lostReason"],
  job: ["customerId", "customer", "date", "size", "mode", "distance", "notes", "travelMiles", "travelCharge", "fuelCharge"],
  truck: [],
  crew: ["crewRole"],
  reminder: [],
  sequence: [],
  damage: ["jobId", "phase", "note", "photoUrl"],
  damageInput: ["phase", "note", "photoData"],
};
const allowedFields = (kind: string) => new Set([...Object.keys(DEFAULTS[kind] ?? {}), ...(EXTRA_FIELDS[kind] ?? [])]);

function clean(kind: string, input: unknown, existing?: Record<string, unknown>): Record<string, unknown> {
  const allowed = allowedFields(kind);
  if (!input || typeof input !== "object" || Array.isArray(input)) fail(400, "Invalid request body");
  const out: Record<string, unknown> = {};
  const entries = Object.entries(input as Record<string, unknown>);
  if (entries.length > 120) fail(400, "Too many fields");
  for (const [k, v] of entries) {
    if (SERVER_FIELDS.has(k) || !FIELD_NAME.test(k) || !allowed.has(k)) continue;
    // Account links are set by the invitation flow; only allow keeping or clearing them.
    if (k === "userId" && v !== null && v !== (existing?.["userId"] ?? null)) continue;
    out[k] = v;
  }
  if (JSON.stringify(out).length > 900_000) fail(413, "Request is too large");
  return out;
}

async function enrichJob(ctx: Ctx, data: Record<string, unknown>, pricing: Pricing) {
  if (!data["customerId"] && data["customer"]) {
    const customer = z.object({ name:z.string().trim().min(1).max(180), email:z.string().trim().email().or(z.literal('')).default(''), phone:z.string().max(40).default(''), source:z.string().max(100).default('Estimate') }).parse(data["customer"]);
    const saved = await create(ctx, "customer", customer);
    data["customerId"] = saved.id;
    delete data["customer"];
  }
  const customerId = Number(data["customerId"]);
  if (customerId) {
    const c = await getOne(ctx, "customer", customerId);
    data["customerName"] = c.data["name"] ?? "";
    data["customerEmail"] = c.data["email"] ?? "";
    data["customerPhone"] = c.data["phone"] ?? "";
  }
  if (!data["proposalToken"]) data["proposalToken"] = crypto.randomUUID().replace(/-/g, "");
  try {
    data["total"] = calculateQuote(data as never, pricing.minimumHours);
  } catch {
    /* keep provided total */
  }
  return data;
}

async function create(ctx: Ctx, kind: string, body: unknown) {
  const ws = requireWs(ctx);
  let data: Record<string, unknown> = { ...DEFAULTS[kind], ...clean(kind, body) };
  if (kind === "job") data = await enrichJob(ctx, data, await pricingFor(ctx));
  const { data: row, error } = await ctx.db
    .from("workspace_records").insert({ workspace_id: ws, kind, data: data as never })
    .select("id,data,created_at").single();
  if (error) fail(403, error.message);
  return toRecord(row as Row, ws);
}

async function update(ctx: Ctx, kind: string, id: number, body: unknown) {
  const ws = requireWs(ctx);
  const current = await getOne(ctx, kind, id);
  let data: Record<string, unknown> = { ...current.data, ...clean(kind, body, current.data) };
  if (kind === "job") data = await enrichJob(ctx, data, await pricingFor(ctx));
  const { data: row, error } = await ctx.db
    .from("workspace_records").update({ data: data as never, updated_at: new Date().toISOString() })
    .eq("id", id).eq("workspace_id", ws).select("id,data,created_at").single();
  if (error) fail(403, error.message);
  return toRecord(row as Row, ws);
}

const assignSchema = z.object({
  truckId: z.number().int().positive().nullable(),
  crewIds: z.array(z.number().int().positive()).max(30),
  moveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  startHour: z.number().min(0).max(23.5),
  duration: z.number().min(0.5).max(24),
}).strip();

// Only dispatch roles assign; truck/crew must belong to this workspace, be active, and be free at that time.
async function assignJob(ctx: Ctx, id: number, body: unknown) {
  if (!["admin", "office_admin", "dispatcher"].includes(ctx.role ?? "")) fail(403, "Only dispatch staff can assign trucks and crew");
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) return fail(400, "Invalid assignment");
  const a = { ...parsed.data, crewIds: [...new Set(parsed.data.crewIds)] };
  const current = await getOne(ctx, "job", id);
  const [trucks, crew, jobs] = (await Promise.all([list(ctx, "truck"), list(ctx, "crew"), list(ctx, "job")])) as Record<string, unknown>[][] as ({ id: number } & Record<string, unknown>)[][];
  if (a.truckId) {
    const t = trucks.find(x => x.id === a.truckId);
    if (!t) fail(400, "That truck is not in this workspace");
    if (t && t["status"] !== "active" && t["status"] !== "available") fail(409, `${String(t["name"])} is not active`);
  }
  for (const cid of a.crewIds) {
    const p = crew.find(x => x.id === cid);
    if (!p) fail(400, "A selected crew member is not in this workspace");
    if (p && p["status"] === "inactive") fail(409, `${String(p["name"])} is inactive`);
  }
  const candidate: ScheduledJob = { id, moveDate: a.moveDate, startHour: a.startHour, duration: a.duration, status: String(current.data["status"] ?? ""), truckId: a.truckId, crewIds: a.crewIds };
  const clash = conflictsFor(candidate, jobs as unknown as ScheduledJob[])[0];
  if (clash) {
    const other = jobs.find(j => j.id === clash.otherJobId);
    const who = clash.resource === "truck"
      ? String(trucks.find(x => x.id === clash.resourceId)?.["name"] ?? "This truck")
      : String(crew.find(x => x.id === clash.resourceId)?.["name"] ?? "A crew member");
    fail(409, `Schedule conflict: ${who} is already on job #${clash.otherJobId}${other?.["title"] ? ` (${String(other["title"])})` : ""} at an overlapping time.`);
  }
  return update(ctx, "job", id, a);
}

// Server-owned writes (timeline, payments) bypass the request field filter on purpose.
async function saveData(ctx: Ctx, id: number, patch: Record<string, unknown>) {
  const ws = requireWs(ctx);
  const current = await getOne(ctx, "job", id);
  const { data: row, error } = await ctx.db.from("workspace_records")
    .update({ data: { ...current.data, ...patch } as never, updated_at: new Date().toISOString() })
    .eq("id", id).eq("workspace_id", ws).select("id,data,created_at").single();
  if (error) fail(403, error.message);
  return toRecord(row as Row, ws);
}

function requireWs(ctx: Ctx): number {
  if (!ctx.wsId || !ctx.role) return fail(403, "Choose a workspace first");
  return ctx.wsId;
}

async function pricingFor(ctx: Ctx): Promise<Pricing> {
  const ws = requireWs(ctx);
  const { data } = await ctx.db.from("workspaces").select("pricing").eq("id", ws).maybeSingle();
  return ((data?.pricing as Pricing | null) ?? DEFAULT_PRICING);
}

async function workspaces(ctx: Ctx) {
  const { data, error } = await ctx.db
    .from("workspace_members").select("role, workspace_id, workspaces(id,name,plan_id,subscription_status,onboarding_completed_at,travel_pricing_type,fuel_surcharge_type,deposit_rule,appearance)").eq("user_id", ctx.userId);
  if (error) fail(500, error.message);
  return (data ?? []).map((m) => {
    const w = m.workspaces as unknown as { id: number; name: string; plan_id: string; subscription_status: string; onboarding_completed_at: string | null; travel_pricing_type: string; fuel_surcharge_type: string; deposit_rule: { value?: number } | null; appearance: unknown };
    return {
      id: w.id, name: w.name, role: m.role,
      appearance: parseAppearance(w.appearance),
      planId: w.plan_id, subscriptionStatus: w.subscription_status,
      onboardingCompleted: !!w.onboarding_completed_at,
      pricingDefaults: w.travel_pricing_type === "none" && w.fuel_surcharge_type === "none" && !Number(w.deposit_rule?.value ?? 0),
    };
  });
}

async function route(ctx: Ctx, method: string, parts: string[], body: () => Promise<unknown>) {
  const [head, idRaw, sub] = parts;
  const id = idRaw ? Number(idRaw) : NaN;

  if (head === "appearance" && (method === "GET" || method === "PUT")) {
    const ws = requireWs(ctx);
    let appearance;
    if (method === "PUT") {
      if (!["admin", "office_admin"].includes(ctx.role ?? "")) fail(403, "Only workspace managers can save appearance");
      const parsed = appearanceSchema.safeParse(await body());
      if (!parsed.success) return fail(400, "Invalid appearance preferences");
      appearance = parsed.data;
      if (!validWallpaperScope(appearance, ws)) fail(403, "Wallpaper belongs to another workspace");
      if (appearance.wallpaper?.kind === "storage") {
        const { data, error } = await ctx.db.storage.from("workspace-wallpapers").createSignedUrl(appearance.wallpaper.value, 60);
        if (error || !data) fail(400, "Upload the wallpaper before saving");
      }
      const { data, error } = await ctx.db.from("workspaces").update({ appearance }).eq("id", ws).select("appearance").single();
      if (error || !data) fail(403, error?.message ?? "Could not save appearance");
    } else {
      const { data, error } = await ctx.db.from("workspaces").select("appearance").eq("id", ws).single();
      if (error || !data) fail(403, "Could not read appearance");
      appearance = parseAppearance(data?.appearance);
    }
    return { appearance, wallpaperUrl: null };
  }

  if (head === "bootstrap" && method === "GET") {
    const all = await workspaces(ctx);
    const workspace = all.find((w) => w.id === ctx.wsId) ?? all[0] ?? null;
    if (ctx.wsId && !all.some((w) => w.id === ctx.wsId)) fail(403, "No access to that workspace");
    const pricing = workspace ? await pricingFor({ ...ctx, wsId: workspace.id, role: workspace.role }) : DEFAULT_PRICING;
    return {
      user: { id: 0, name: ctx.email.split("@")[0] ?? "", email: ctx.email },
      workspaces: all,
      workspace,
      pricing,
    };
  }
  if (head === "workspaces" && method === "POST") {
    const { name } = (await body()) as { name?: unknown };
    if (typeof name !== "string") fail(400, "Name is required");
    const { data, error } = await ctx.db.rpc("create_workspace", { _name: name as string });
    if (error) fail(400, error.message);
    return { id: data as number, name: (name as string).trim(), role: "admin" };
  }
  if (head === "dashboard" && method === "GET") {
    const [customers, jobs, reminders, trucks, crew] = await Promise.all(
      ["customer", "job", "reminder", "truck", "crew"].map((k) => list(ctx, k)),
    );
    return { customers, jobs, reminders, trucks, crew, payments: [] };
  }
  if (head === "pricing") {
    if (method === "GET") return pricingFor(ctx);
    if (method === "PUT") {
      if (!canEditTariffs(ctx.role)) fail(403, "Only admins can edit tariffs");
      const parsed = pricingSchema.safeParse(await body());
      if (!parsed.success) return fail(400, "Invalid pricing settings");
      const value = parsed.data;
      const { error } = await ctx.db.from("workspaces").update({ pricing: value as never }).eq("id", requireWs(ctx));
      if (error) fail(403, error.message);
      return value;
    }
  }
  if (head === 'reports' && method === 'GET') {
    const [jobs, crew, customers] = await Promise.all(['job', 'crew', 'customer'].map(k => list(ctx, k)));
    return { ...operationalReport(jobs as never, crew as never, customers as never), hasJobs: jobs.length > 0 };
  }
  if (head === 'tariffs' && (method === 'GET' || method === 'PUT')) {
    const ws = requireWs(ctx);
    if (method === 'PUT') {
      if (!canEditTariffs(ctx.role)) fail(403, 'Only admins can edit tariffs');
      const parsed = z.object({ pricing: pricingSchema, travel: travelSettingsSchema }).safeParse(await body());
      if (!parsed.success) fail(400, 'Invalid tariff settings');
      if (!parsed.success) return;
      const s = parsed.data.travel;
      const { error } = await ctx.db.from('workspaces').update({
        pricing: parsed.data.pricing as never, dispatch_address: s.dispatchAddress || null,
        travel_pricing_type: s.travelPricingType, travel_flat_rate: s.travelFlatRate, travel_mileage_rate: s.travelMileageRate,
        fuel_surcharge_type: s.fuelSurchargeType, fuel_flat_rate: s.fuelFlatRate, fuel_per_mile_rate: s.fuelPerMileRate, fuel_percentage_rate: s.fuelPercentageRate,
      }).eq('id', ws);
      if (error) fail(403, 'Could not save tariff settings');
    }
    const { data: row, error } = await ctx.db.from('workspaces').select('pricing,dispatch_address,travel_pricing_type,travel_flat_rate,travel_mileage_rate,fuel_surcharge_type,fuel_flat_rate,fuel_per_mile_rate,fuel_percentage_rate').eq('id', ws).single();
    if (error || !row) return fail(500, 'Could not load tariff settings');
    return { pricing: { ...DEFAULT_PRICING, ...(row.pricing as object ?? {}), truckFee: Number((row.pricing as Record<string, unknown> | null)?.['truckFee'] ?? 0) }, travel: {
      dispatchAddress: row.dispatch_address ?? '', travelPricingType: row.travel_pricing_type,
      travelFlatRate: Number(row.travel_flat_rate), travelMileageRate: Number(row.travel_mileage_rate),
      fuelSurchargeType: row.fuel_surcharge_type, fuelFlatRate: Number(row.fuel_flat_rate), fuelPerMileRate: Number(row.fuel_per_mile_rate), fuelPercentageRate: Number(row.fuel_percentage_rate),
    } };
  }
  if (head === "members") {
    const ws = requireWs(ctx);
    if (method === "GET") {
      const { data } = await ctx.db.from("workspace_members").select("id,user_id,name,email,role").eq("workspace_id", ws);
      return (data ?? []).map((m) => ({ id: m.id, userId: 0, name: m.name, email: m.email, role: m.role }));
    }
    if (method === "PATCH" && id) {
      const { role } = (await body()) as { role?: unknown };
      if (typeof role !== "string") fail(400, "Role is required");
      const { data, error } = await ctx.db.from("workspace_members").update({ role: role as string })
        .eq("id", id).eq("workspace_id", ws).select("id,name,email,role").single();
      if (error) fail(403, error.message);
      return { ...data, userId: 0 };
    }
    if (method === "POST") fail(501, "Inviting teammates is coming in the next migration step");
  }
  if (head === "workers" && method === "GET" && !idRaw) {
    const crew = await list(ctx, "crew");
    const from = ctx.q?.get("from") ?? "";
    const to = ctx.q?.get("to") ?? "";
    return {
      period: { from, to },
      workers: crew.map((c) => ({ ...c, approvedMinutes: 0, baseEarnedCents: 0, tipsCents: 0, totalEarnedCents: 0, completedJobs: 0, paidCents: 0 })),
    };
  }
  if (head === "invitations") {
    const ws = requireWs(ctx);
    if (!["admin", "office_admin"].includes(ctx.role ?? "")) fail(403, "Only Admin and Office admin can manage invitations");
    const COLS = "id,kind,email,role,hourly_rate,candidate_id,token,status,send_count,last_sent_at,accepted_at,expires_at,created_at";
    type Inv = { id: number; kind: string; email: string | null; role: string; hourly_rate: number; candidate_id: number | null; token: string; status: string; send_count: number; last_sent_at: string | null; accepted_at: string | null; expires_at: string; created_at: string };
    const origin = (o: unknown) => {
      const v = typeof o === "string" ? o : "";
      return /^https?:\/\/[^/\s]+$/.test(v) ? v : "";
    };
    const shape = (r: Inv, o = "") => {
      const expired = r.status === "pending" && new Date(r.expires_at) < new Date();
      return {
        id: r.id, kind: r.kind, email: r.email, role: r.role,
        hourlyRateCents: Math.round(Number(r.hourly_rate) * 100), workerId: r.candidate_id,
        status: expired ? "expired" : r.status, expiresAt: r.expires_at, createdAt: r.created_at,
        acceptedAt: r.accepted_at, acceptedByUserId: null,
        sendStatus: r.kind === "email" ? (r.send_count ? "opened in email app" : "not sent") : "link",
        lastSentAt: r.last_sent_at, sendError: null, token: r.token,
        inviteUrl: `${o}/join-crew?token=${r.token}`,
      };
    };
    if (method === "GET" && !idRaw) {
      const { data, error } = await ctx.db.from("workspace_invitations").select(COLS)
        .eq("workspace_id", ws).neq("status", "revoked").order("created_at", { ascending: false }).limit(200);
      if (error) fail(500, error.message);
      return (data as Inv[]).map((r) => shape(r));
    }
    if (method === "POST" && !idRaw) {
      const b = (await body()) as Record<string, unknown>;
      const kind = b["kind"] === "email" ? "email" : "link";
      const email = kind === "email" ? String(b["email"] ?? "").trim().slice(0, 200) : null;
      if (kind === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email ?? "")) fail(400, "Enter a valid email address");
      const role = ["crew", "dispatcher", "estimator", "office_admin", "admin"].includes(String(b["role"])) ? String(b["role"]) : "crew";
      if (role === "admin" && ctx.role !== "admin") fail(403, "Only an Admin can invite another Admin");
      const cents = Number(b["hourlyRateCents"] ?? 0);
      if (!Number.isFinite(cents) || cents < 0 || cents > 100000) fail(400, "Enter a valid hourly rate");
      const cand = b["workerId"] == null || b["workerId"] === "" ? null : Number(b["workerId"]);
      if (cand !== null) await getOne(ctx, "crew", cand);
      const { data, error } = await ctx.db.from("workspace_invitations")
        .insert({ workspace_id: ws, kind, email, role, hourly_rate: cents / 100, candidate_id: cand, send_count: kind === "email" ? 1 : 0, last_sent_at: kind === "email" ? new Date().toISOString() : null })
        .select(COLS).single();
      if (error) fail(403, error.message);
      const inv = shape(data as Inv, origin(b["publicOrigin"]));
      return { invitation: inv, inviteUrl: inv.inviteUrl };
    }
    if (method === "POST" && id && (sub === "resend" || sub === "revoke")) {
      const b = (await body()) as Record<string, unknown>;
      const patch = sub === "revoke"
        ? { status: "revoked" }
        : { expires_at: new Date(Date.now() + 14 * 864e5).toISOString(), last_sent_at: new Date().toISOString() };
      const { data, error } = await ctx.db.from("workspace_invitations").update(patch)
        .eq("id", id).eq("workspace_id", ws).eq("status", "pending").select(COLS).maybeSingle();
      if (error) fail(403, error.message);
      if (sub === "revoke") {
        if (data) return { revoked: true, status: "revoked" };
        // A repeated revoke is successful; never overwrite an accepted invitation.
        const { data: current, error: readError } = await ctx.db.from("workspace_invitations")
          .select("status").eq("id", id).eq("workspace_id", ws).maybeSingle();
        if (readError) fail(403, readError.message);
        if (!current) return fail(404, "Invitation not found");
        return { revoked: current.status === "revoked", status: current.status };
      }
      if (!data) fail(409, "This invitation is no longer pending");
      const inv = shape(data as Inv, origin(b["publicOrigin"]));
      return { invitation: inv, inviteUrl: inv.inviteUrl };
    }
  }
  if (head === "invites") {
    const ws = requireWs(ctx);
    if (!["admin", "office_admin", "dispatcher"].includes(ctx.role ?? "")) fail(403, "Only managers can invite crew");
    if (method === "GET") {
      const { data, error } = await ctx.db.from("crew_invites")
        .select("id,token,email,crew_role,accepted_at,expires_at,created_at")
        .eq("workspace_id", ws).order("id", { ascending: false }).limit(100);
      if (error) fail(500, error.message);
      return data;
    }
    if (method === "POST") {
      const b = (await body()) as { email?: string; crewRole?: string };
      const email = String(b.email ?? "").trim().slice(0, 200);
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail(400, "Enter a valid email");
      const crewRole = ["driver", "helper", "crew_lead"].includes(String(b.crewRole)) ? String(b.crewRole) : "helper";
      const { data, error } = await ctx.db.from("crew_invites")
        .insert({ workspace_id: ws, email, crew_role: crewRole })
        .select("id,token,email,crew_role,accepted_at,expires_at,created_at").single();
      if (error) fail(403, error.message);
      return data;
    }
    if (method === "DELETE" && id) {
      const { error } = await ctx.db.from("crew_invites").delete().eq("id", id).eq("workspace_id", ws);
      if (error) fail(403, error.message);
      return { deleted: true };
    }
  }
  if (head === "field") return fieldRoute(ctx, method, parts.slice(1), body, { list, getOne, update, saveData, requireWs, fail, toRecord });
  // Crew members work through the field endpoints; they cannot edit jobs or customers directly.
  if (ctx.role === "crew" && method !== "GET" && (head === "jobs" || head === "customers")) fail(403, "Crew members can update jobs only from the field screen");
  // Crew roster and fleet (roles, driver status, pay) are managed by office staff only.
  if (ctx.role === "crew" && method !== "GET" && (head === "crew" || head === "trucks")) fail(403, "Only office staff can change the crew roster or fleet");
  if (head === "payments" && method === "GET") return [];
  if (head === "outbox" && method === "GET") return [];

  if (head === "jobs" && id && (sub === "deletion-preview" || (!sub && method === "DELETE"))) {
    if (ctx.role !== "admin" && ctx.role !== "office_admin") fail(403, "Only admins can delete jobs");
    const job = await getOne(ctx, "job", id);
    const revision = String(job.data["updatedAt"] ?? job.created_at);
    if (sub === "deletion-preview")
      return { jobId: id, title: String(job.data["title"] ?? ""), timecards: 0, inventory: Array.isArray(job.data["inventory"]) ? (job.data["inventory"] as unknown[]).length : 0, invoices: 0, blockers: [], revision };
    const b = (await body()) as { confirm?: boolean };
    if (!b.confirm) fail(400, "Please confirm the deletion");
    const { error } = await ctx.db.from("workspace_records").delete().eq("id", id).eq("workspace_id", requireWs(ctx)).eq("kind", "job");
    if (error) fail(403, error.message);
    return { deleted: true };
  }
  if (head === "jobs" && id && sub) {
    if (sub === "test-approve" && method === "POST") {
      if (!canTestBook(new URL(ctx.origin ?? 'https://invalid.local').hostname, ctx.role)) fail(403, "Manual test booking is available to admins on preview only");
      const parsed = z.object({ confirm: z.literal(true) }).strict().safeParse(await body());
      if (!parsed.success) fail(400, "Please confirm the test booking");
      const ws = requireWs(ctx);
      const current = await getOne(ctx, "job", id);
      if (current.data['status'] !== 'estimate' && !(current.data['status'] === 'booked' && current.data['testApproval'])) fail(409, "Only estimates can be approved for testing");
      const { supabaseAdmin } = await import('../integrations/supabase/client.server');
      const { error } = await supabaseAdmin.rpc('book_job_for_preview', { _ws: ws, _job: id, _actor: ctx.userId });
      if (error) fail(409, "Could not approve this estimate for testing");
      return toRecord(await getOne(ctx, "job", id), ws);
    }
    if (sub === "assign" && method === "POST") return assignJob(ctx, id, await body());
    if (sub === "clock" && method === "POST") {
      const { action } = (await body()) as { action?: string };
      const now = new Date().toISOString();
      return update(ctx, "job", id, action === "in" ? { clockIn: now, status: "in_progress" } : { clockOut: now });
    }
    if (sub === "complete" && method === "POST") {
      const { signature } = (await body()) as { signature?: string };
      return update(ctx, "job", id, { completedSignature: signature ?? null, status: "completed" });
    }
    if (sub === "damage") {
      if (method === "GET")
        return (await list(ctx, "damage")).filter((d) => (d as Record<string, unknown>)["jobId"] === id);
      if (method === "POST") {
        const b = clean("damageInput", await body());
        return create(ctx, "damage", { jobId: id, phase: b["phase"], note: b["note"], photoUrl: b["photoData"] ?? null });
      }
    }
  }

  const kind = head ? KINDS[head] : undefined;
  if (kind) {
    if (method === "GET" && !idRaw) return list(ctx, kind);
    if (method === "GET" && id) return toRecord(await getOne(ctx, kind, id), requireWs(ctx));
    if (method === "POST" && !idRaw) return create(ctx, kind, await body());
    if (method === "PATCH" && id) return update(ctx, kind, id, await body());
  }
  return fail(404, "This request could not be found. Refresh the page and try again.");
}

export async function handleCrm(request: Request, splat: string) {
  try {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) fail(500, "Backend is not configured");
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) fail(401, "Please sign in");
    const db = createClient(url as string, key as string, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: claims, error } = await db.auth.getClaims(token as string);
    if (error || !claims?.claims?.sub) fail(401, "Please sign in");
    const verifiedClaims = claims?.claims;
    if (!verifiedClaims?.sub) return fail(401, "Please sign in");
    const userId = verifiedClaims.sub as string;
    const email = (verifiedClaims["email"] as string | undefined) ?? "";
    const wsHeader = Number(request.headers.get("x-workspace-id")) || null;
    let role: string | null = null;
    if (wsHeader) {
      const { data } = await db.rpc("workspace_role", { _ws: wsHeader });
      role = (data as string | null) ?? null;
    }
    const parts = splat.split("/").filter(Boolean);
    if (role && request.method !== "GET" && parts[0] !== "workspaces") {
      const { data: writable } = await db.rpc("workspace_writable", { _ws: wsHeader as number });
      if (!writable) fail(402, "This workspace is read-only. Update the subscription or contact support.");
    }
    const result = await route({ db, userId, email, wsId: role ? wsHeader : null, role, q: new URL(request.url).searchParams, origin: new URL(request.url).origin }, request.method, parts, async () => {
      try {
        return await request.json();
      } catch {
        return {};
      }
    });
    return Response.json(result ?? null);
  } catch (e) {
    if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
    console.error(e);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
