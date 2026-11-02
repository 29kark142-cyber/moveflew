// Move-day endpoints for the crew phone screen. Database row security already limits crew
// members to jobs they are assigned to; these handlers add role and order checks on top.
import { z } from "zod";
import type { Ctx, Row } from "./crm-api";
import { acceptedTime, billableHours, fieldStatus, finalBill, isPhase, nextPhase, type Timeline } from "../shared/field";
import { isPreviewHost } from "../lib/payment-mode";
import { documentSchema, operationSchema, type FieldDocuments, type FieldSnapshot } from '../shared/field-documents';
import { finalizeFieldSnapshot, prepareFieldPdf, streamFieldPdf, officeEmailSchema } from './field-documents';

type Rec = Record<string, unknown> & { id: number };
type Helpers = {
  list: (ctx: Ctx, kind: string) => Promise<unknown[]>;
  getOne: (ctx: Ctx, kind: string, id: number) => Promise<Row>;
  update: (ctx: Ctx, kind: string, id: number, body: unknown) => Promise<unknown>;
  saveData: (ctx: Ctx, id: number, patch: Record<string, unknown>) => Promise<Rec>;
  requireWs: (ctx: Ctx) => number;
  fail: (status: number, message: string) => never;
  toRecord: (r: Row, ws: number) => Rec;
};

const OFFICE = ["admin", "office_admin", "dispatcher"];
const ACTIVE = (s: unknown) => !["cancelled", "declined", "lead", "estimate"].includes(String(s ?? ""));

async function me(ctx: Ctx, h: Helpers) {
  const crew = (await h.list(ctx, "crew")) as Rec[];
  return crew.find(c => c["userId"] === ctx.userId) ?? null;
}

function view(job: Rec) {
  const t = (job["timeline"] ?? {}) as Timeline;
  const hours = Number(job["billableHours"]) || billableHours(t);
  return {
    ...job,
    fieldStatus: fieldStatus(t),
    nextPhase: nextPhase(t),
    bill: finalBill(job, hours),
  };
}

async function loadJob(ctx: Ctx, h: Helpers, id: number) {
  const row = await h.getOne(ctx, "job", id); // 404 when row security hides it
  return h.toRecord(row, h.requireWs(ctx));
}

export async function fieldRoute(ctx: Ctx, method: string, parts: string[], body: () => Promise<unknown>, h: Helpers) {
  h.requireWs(ctx);
  if (!ctx.role || ctx.role === "estimator") return h.fail(403, "Field job sheets are for dispatch and assigned crew");
  const office = OFFICE.includes(ctx.role);
  const [head, idRaw, sub] = parts;
  if(head==='settings') {
    if(method==='POST') { if(!['admin','office_admin'].includes(ctx.role))h.fail(403,'Only admins can set the office email');const parsed=officeEmailSchema.parse(await body());const {error}=await ctx.db.from('workspaces').update({office_email:parsed.officeEmail}).eq('id',Number(ctx.wsId));if(error)h.fail(403,'Could not save office email'); }
    const {data}=await ctx.db.from('workspaces').select('office_email,name,company_phone').eq('id',Number(ctx.wsId)).single();
    return {officeEmail:data?.office_email || '',companyName:data?.name || '',phone:data?.company_phone || ''};
  }

  if (head === "jobs" && !idRaw && method === "GET") {
    const date = ctx.q?.get("date") ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return h.fail(400, "Choose a day");
    const self = await me(ctx, h);
    const jobs = ((await h.list(ctx, "job")) as Rec[])
      .filter(j => String(j["moveDate"] ?? "").slice(0, 10) === date && ACTIVE(j["status"]))
      .filter(j => office || (self && Array.isArray(j["crewIds"]) && (j["crewIds"] as unknown[]).includes(self.id)))
      .sort((a, b) => Number(a["startHour"] ?? 0) - Number(b["startHour"] ?? 0));
    return { me: self ? { id: self.id, name: self["name"], crewRole: self["crewRole"] ?? (self["isDriver"] ? "driver" : "helper") } : null, jobs: jobs.map(view) };
  }

  const id = Number(idRaw);
  if (head !== "jobs" || !Number.isInteger(id) || id <= 0) return h.fail(404, "Not found");
  const job = await loadJob(ctx, h, id);
  if(!office) { const self=await me(ctx,h);if(!self || !Array.isArray(job['crewIds']) || !(job['crewIds'] as unknown[]).includes(self.id))h.fail(403,'This job is not assigned to you'); }
  const t = { ...((job["timeline"] ?? {}) as Timeline) };

  if (!sub && method === "GET") return view(job);
  if(sub==='documents' && method==='POST') {
    if(job['completedSignature'])h.fail(409,'Signed documents are locked');
    const b=z.object({document:documentSchema,operationId:operationSchema}).parse(await body());
    const docs=(job['fieldDocuments'] || {}) as FieldDocuments;
    if(docs[b.document.kind]?.signature===b.document.signature && b.document.signature)return view(job);
    if(docs[b.document.kind]?.signature)h.fail(409,'This signed document is locked');
    const doc={...b.document,...(b.document.signature?{signedAt:new Date().toISOString(),by:ctx.userId}:{})};
    return view(await h.saveData(ctx,id,{fieldDocuments:{...docs,[doc.kind]:doc}}));
  }
  if(sub==='pdf' && method==='GET') {
    if(!job['fieldDocumentId'])h.fail(404,'Sign off this job to create the PDF');
    return prepareFieldPdf(ctx,String(job['fieldDocumentId']));
  }
  if(sub==='pdf-file' && method==='GET') {
    if(!job['fieldDocumentId'])h.fail(404,'Sign off this job to create the PDF');
    return streamFieldPdf(ctx,String(job['fieldDocumentId']));
  }

  if (sub === "phase" && method === "POST") {
    const self = await me(ctx, h);
    const lead = self && ["crew_lead", "driver"].includes(String(self["crewRole"] ?? (self["isDriver"] ? "driver" : "")));
    if (!office && !lead) h.fail(403, "Only the crew lead or driver can change the job stage");
    const b = z.object({ phase: z.string(), at: z.string().optional() }).parse(await body());
    if (!isPhase(b.phase)) h.fail(400, "Unknown stage");
    if (t[b.phase as keyof Timeline]) return view(job); // repeated tap (e.g. offline replay) is harmless
    if (nextPhase(t) !== b.phase) h.fail(409, "Finish the earlier stage first");
    const prev = Object.values(t).map(v => Date.parse(String(v))).filter(Number.isFinite);
    let at = acceptedTime(b.at);
    if (prev.length && Date.parse(at) < Math.max(...prev)) at = new Date(Math.max(...prev)).toISOString();
    t[b.phase as keyof Timeline] = at;
    const patch: Record<string, unknown> = { timeline: t };
    if (b.phase === "start_travel") patch["status"] = "in_progress";
    if (b.phase === "arrive_pickup") patch["clockIn"] = at;
    if (b.phase === "complete") {
      const hours = billableHours(t);
      const bill = finalBill(job, hours);
      Object.assign(patch, { clockOut: at, status: "completed", billableHours: hours, actualHours: hours, finalBill: bill, finalTotal: bill.labor + bill.travel + bill.fees });
    }
    return view(await h.saveData(ctx, id, patch));
  }

  if (sub === "photos") {
    if (method === "GET") {
      const all = (await h.list(ctx, "damage")) as Rec[];
      return all.filter(d => d["jobId"] === id).map(d => ({ id: d.id, phase: d["phase"], note: d["note"], photoUrl: d["photoUrl"], createdAt: d["createdAt"] }));
    }
    if (method === "POST") {
      const b = z.object({
        photoData: z.string().regex(/^data:image\/(jpeg|png|webp);base64,/).max(700_000),
        note: z.string().trim().max(500).default(""),
        phase: z.enum(["pre", "post"]).default("pre"),
        operationId:operationSchema,
      }).parse(await body());
      if(job['completedSignature'])h.fail(409,'Inspection photos are locked after sign-off');
      const {supabaseAdmin}=await import('../integrations/supabase/client.server');
      const {data:prior}=await supabaseAdmin.from('field_operation_receipts').select('result').eq('operation_id',b.operationId).eq('workspace_id',Number(ctx.wsId)).eq('job_id',id).maybeSingle();
      if(prior)return prior.result;
      // Stable operation IDs make offline photo retries idempotent, including response loss.
      const {data:existing}=await ctx.db.from('workspace_records').select('id').eq('workspace_id',Number(ctx.wsId)).eq('kind','damage').contains('data',{jobId:id,operationId:b.operationId}).maybeSingle();
      if(existing)return {id:existing.id};
      const { data: row, error } = await ctx.db.from("workspace_records")
        .insert({ workspace_id: h.requireWs(ctx), kind: "damage", data: { jobId: id, phase: b.phase, note: b.note, photoUrl: b.photoData, by: ctx.userId,operationId:b.operationId } as never })
        .select("id,data,created_at").single();
      if (error) h.fail(403, error.message);
      await supabaseAdmin.from('field_operation_receipts').upsert({operation_id:b.operationId,workspace_id:Number(ctx.wsId),job_id:id,kind:'photo',result:{id:(row as Row).id}},{onConflict:'operation_id'});
      return { id: (row as Row).id };
    }
  }

  if (sub === "signoff" && method === "POST") {
    if (!t.complete) h.fail(409, "Complete the job before the customer signs off");
    const b = z.object({ signature: z.string().regex(/^data:image\/png;base64,iVBOR/).min(100).max(400_000),operationId:operationSchema }).parse(await body());
    const {data:company}=await ctx.db.from('workspaces').select('name,office_email,company_phone').eq('id',Number(ctx.wsId)).single();
    const photos=((await h.list(ctx,'damage')) as Rec[]).filter(p=>p['jobId']===id).map(p=>({note:String(p['note']||''),phase:String(p['phase']||''),photoUrl:String(p['photoUrl']||'')}));
    const snapshot:FieldSnapshot={company:{name:company?.name || '',officeEmail:company?.office_email || '',phone:company?.company_phone || ''},job:view(job),documents:(job['fieldDocuments'] || {}) as FieldDocuments,photos,signature:b.signature,signedAt:new Date().toISOString(),by:ctx.userId};
    if(!snapshot.documents.bol?.signature)snapshot.documents={...snapshot.documents,bol:{kind:'bol',notes:snapshot.documents.bol?.notes || '',items:snapshot.documents.bol?.items || [],signature:b.signature,signedAt:snapshot.signedAt,by:ctx.userId}};
    const pdf=await finalizeFieldSnapshot(ctx,id,b.operationId,snapshot);
    return {...view(await loadJob(ctx,h,id)),fieldPdf:pdf};
  }

  if (sub === "pay-offline" && method === "POST") {
    if (!t.complete) h.fail(409, "Complete the job first");
    if (job["finalPayment"]) h.fail(409, "The final payment is already recorded");
    const b = z.object({ method: z.enum(["cash", "check"]), reference: z.string().trim().max(80).default("") }).parse(await body());
    const due = view(job).bill.due;
    return view(await h.saveData(ctx, id, {
      finalPayment: { method: b.method, reference: b.reference, amountCents: Math.round(due * 100), at: new Date().toISOString(), by: ctx.userId },
      invoiceStatus: "paid",
    }));
  }

  if (sub === "checkout" && method === "POST") {
    if (!t.complete) h.fail(409, "Complete the job first");
    if (job["finalPayment"]) h.fail(409, "The final payment is already recorded");
    const cents = Math.round(view(job).bill.due * 100);
    if (cents < 50) h.fail(400, "Nothing left to collect by card");
    const env = isPreviewHost(new URL(ctx.origin ?? "http://localhost").hostname) ? "sandbox" : "live";
    const { createStripeClient, getStripeErrorMessage } = await import("../lib/stripe.server");
    try {
      const stripe = createStripeClient(env);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        success_url: `${ctx.origin}/payment-complete`,
        line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: cents, product_data: { name: `Moving services · job #${id}` } } }],
        metadata: { jobId: String(id), workspaceId: String(ctx.wsId), kind: "final_balance" },
      });
      await h.saveData(ctx, id, { finalCheckout: { sessionId: session.id, url: session.url, env, amountCents: cents, createdAt: new Date().toISOString() } });
      return { url: session.url, env, amountCents: cents };
    } catch (e) {
      return h.fail(502, getStripeErrorMessage(e));
    }
  }

  // Confirms card payment by asking Stripe directly, so a paid status can never come from the phone.
  if (sub === "checkout-status" && method === "POST") {
    const fc = job["finalCheckout"] as { sessionId?: string; env?: "sandbox" | "live"; amountCents?: number } | undefined;
    if (job["finalPayment"]) return view(job);
    if (!fc?.sessionId || !fc.env) return view(job);
    const { createStripeClient } = await import("../lib/stripe.server");
    const s = await createStripeClient(fc.env).checkout.sessions.retrieve(fc.sessionId);
    if (s.payment_status === "paid" && s.amount_total === fc.amountCents && s.metadata?.["jobId"] === String(id)) {
      return view(await h.saveData(ctx, id, {
        finalPayment: { method: "card", mode: s.livemode ? "live" : "test", amountCents: s.amount_total, sessionId: s.id, at: new Date().toISOString() },
        invoiceStatus: "paid",
      }));
    }
    return view(job);
  }

  return h.fail(404, "Not found");
}
