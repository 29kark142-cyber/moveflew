// Core workspace CRM API on Lovable Cloud. Replaces the Manus Express /api/crm router.
// Every request runs as the signed-in user, so database row security applies.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { calculateQuote, DEFAULT_PRICING, type Pricing } from "../shared/crm";

type Ctx = { db: SupabaseClient; userId: string; email: string; wsId: number | null; role: string | null };
type Row = { id: number; data: Record<string, unknown>; created_at: string };

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

function clean(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail(400, "Invalid request body");
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (["id", "tenantId", "createdAt"].includes(k)) continue;
    out[k] = v;
  }
  if (JSON.stringify(out).length > 900_000) fail(413, "Request is too large");
  return out;
}

async function enrichJob(ctx: Ctx, data: Record<string, unknown>, pricing: Pricing) {
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
  let data: Record<string, unknown> = { ...DEFAULTS[kind], ...clean(body) };
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
  let data: Record<string, unknown> = { ...current.data, ...clean(body) };
  if (kind === "job") data = await enrichJob(ctx, data, await pricingFor(ctx));
  const { data: row, error } = await ctx.db
    .from("workspace_records").update({ data: data as never, updated_at: new Date().toISOString() })
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
    .from("workspace_members").select("role, workspace_id, workspaces(id,name)").eq("user_id", ctx.userId);
  if (error) fail(500, error.message);
  return (data ?? []).map((m) => {
    const w = m.workspaces as unknown as { id: number; name: string };
    return { id: w.id, name: w.name, role: m.role };
  });
}

async function route(ctx: Ctx, method: string, parts: string[], body: () => Promise<unknown>) {
  const [head, idRaw, sub] = parts;
  const id = idRaw ? Number(idRaw) : NaN;

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
      const value = clean(await body());
      const { error } = await ctx.db.from("workspaces").update({ pricing: value as never }).eq("id", requireWs(ctx));
      if (error) fail(403, error.message);
      return value;
    }
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
    if (sub === "assign" && method === "POST") return update(ctx, "job", id, await body());
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
        const b = clean(await body());
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
  return fail(404, "This workspace feature is not available yet");
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
    const userId = claims!.claims.sub as string;
    const email = (claims!.claims["email"] as string | undefined) ?? "";
    const wsHeader = Number(request.headers.get("x-workspace-id")) || null;
    let role: string | null = null;
    if (wsHeader) {
      const { data } = await db.rpc("workspace_role", { _ws: wsHeader });
      role = (data as string | null) ?? null;
    }
    const parts = splat.split("/").filter(Boolean);
    const result = await route({ db, userId, email, wsId: role ? wsHeader : null, role }, request.method, parts, async () => {
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
