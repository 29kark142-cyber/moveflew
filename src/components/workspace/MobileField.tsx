import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Banknote, Camera, CheckCircle2, ChevronLeft, CreditCard, MapPin, MessageSquare, Phone, RefreshCw, WifiOff } from "lucide-react";
import { crmFetch } from "@/lib/crm";
import SignaturePad from "@/components/workspace/SignaturePad";
import { FIELD_PHASES, type FieldPhase, type FieldStatus, type FinalBill, type Timeline } from "@shared/field";

type FieldJob = Record<string, unknown> & {
  id: number; title?: string; origin?: string; destination?: string; startHour?: number; customerName?: string; customerPhone?: string;
  timeline?: Timeline; fieldStatus: FieldStatus; nextPhase: FieldPhase | null; bill: FinalBill;
  completedSignature?: string | null; finalPayment?: { method: string; amountCents: number; mode?: string } | null;
};
type Me = { id: number; name: string; crewRole: string } | null;
type Photo = { id: number; note: string; photoUrl: string; phase: string };
type Queued = { jobId: number; phase: FieldPhase; at: string };

// Kept outside the "nwcrewcrm." prefix so release cleanup never drops unsent move-day taps.
const CACHE = "nwc-field-cache";
const QUEUE = "nwc-field-queue";
const OFFICE = ["admin", "office_admin", "dispatcher"];

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const hourLabel = (h = 8) => { const hh = Math.floor(h); const m = Math.round((h - hh) * 60); return new Date(2000, 0, 1, hh, m).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); };
const timeOf = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "");
const readQueue = (): Queued[] => { try { return JSON.parse(localStorage.getItem(QUEUE) || "[]"); } catch { return []; } };
const post = <T,>(path: string, body: unknown = {}) => crmFetch<T>(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const isOffline = (e: unknown) => !navigator.onLine || (e instanceof TypeError);

const BADGE: Record<FieldStatus, string> = {
  Assigned: "bg-muted text-foreground",
  "In Transit": "bg-accent text-accent-foreground",
  "In Progress": "bg-primary/15 text-primary",
  Completed: "bg-primary text-primary-foreground",
};

async function shrink(file: File): Promise<string> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.7);
}

export default function MobileField({ role }: { role: string }) {
  const [date, setDate] = useState(today);
  const [jobs, setJobs] = useState<FieldJob[] | null>(null);
  const [me, setMe] = useState<Me>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [offline, setOffline] = useState(false);
  const [pending, setPending] = useState(0);

  const load = useCallback(async () => {
    try {
      const r = await crmFetch<{ me: Me; jobs: FieldJob[] }>(`/field/jobs?date=${date}`);
      setJobs(r.jobs); setMe(r.me); setOffline(false);
      localStorage.setItem(CACHE, JSON.stringify({ date, ...r }));
    } catch (e) {
      const cached = (() => { try { return JSON.parse(localStorage.getItem(CACHE) || "null"); } catch { return null; } })();
      if (cached?.date === date) { setJobs(cached.jobs); setMe(cached.me); setOffline(true); }
      else { setJobs([]); toast.error(e instanceof Error ? e.message : "Could not load jobs"); }
    }
  }, [date]);

  const flush = useCallback(async () => {
    const q = readQueue();
    setPending(q.length);
    if (!q.length || !navigator.onLine) return;
    const rest: Queued[] = [];
    for (const item of q) {
      try { await post(`/field/jobs/${item.jobId}/phase`, { phase: item.phase, at: item.at }); }
      catch (e) { if (isOffline(e)) rest.push(item); else toast.error(e instanceof Error ? e.message : "A saved stage was refused"); }
    }
    localStorage.setItem(QUEUE, JSON.stringify(rest));
    setPending(rest.length);
    if (rest.length < q.length) { toast.success("Offline updates synced"); void load(); }
  }, [load]);

  useEffect(() => { void flush().then(load); }, [flush, load]);
  useEffect(() => {
    const on = () => void flush();
    const off = () => setOffline(true);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, [flush]);

  const replace = (j: FieldJob) => setJobs(list => (list ?? []).map(x => (x.id === j.id ? j : x)));
  const open = jobs?.find(j => j.id === openId) ?? null;

  return (
    <div className="mx-auto w-full max-w-xl space-y-4 pb-24">
      {open ? (
        <JobSheet job={open} me={me} role={role} onBack={() => setOpenId(null)} onChange={replace}
          queue={(item) => { const q = [...readQueue(), item]; localStorage.setItem(QUEUE, JSON.stringify(q)); setPending(q.length); }} />
      ) : (
        <>
          <header className="flex items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Today's jobs</h1>
              <p className="text-sm text-muted-foreground">{me ? `Signed in as ${me.name}` : OFFICE.includes(role) ? "Showing every crew's jobs" : "Jobs assigned to you"}</p>
            </div>
            <button onClick={() => void load()} aria-label="Refresh" className="rounded-full border border-border p-3 text-foreground active:scale-95"><RefreshCw className="h-5 w-5" /></button>
          </header>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground" />
          {(offline || pending > 0) && (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted p-3 text-sm text-foreground">
              <WifiOff className="h-4 w-4 shrink-0" />
              {offline ? "Offline — showing the last saved list." : ""} {pending > 0 ? `${pending} stage update(s) will sync when you're back online.` : ""}
            </div>
          )}
          {jobs === null ? <p className="text-muted-foreground">Loading…</p> : jobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">No jobs assigned for this day.</div>
          ) : jobs.map(j => <JobCard key={j.id} job={j} onOpen={() => setOpenId(j.id)} />)}
        </>
      )}
    </div>
  );
}

function QuickActions({ job }: { job: FieldJob }) {
  const nav = (addr?: string) => (addr ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}` : undefined);
  const apple = (addr?: string) => (addr ? `https://maps.apple.com/?daddr=${encodeURIComponent(addr)}` : undefined);
  const phone = (job.customerPhone ?? "").replace(/[^\d+]/g, "");
  const btn = "flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground active:scale-95 aria-disabled:pointer-events-none aria-disabled:opacity-40";
  return (
    <div className="grid grid-cols-2 gap-2">
      <a className={btn} href={nav(job.origin)} target="_blank" rel="noreferrer" aria-disabled={!job.origin}><MapPin className="h-4 w-4" />Navigate to Pickup</a>
      <a className={btn} href={nav(job.destination)} target="_blank" rel="noreferrer" aria-disabled={!job.destination}><MapPin className="h-4 w-4" />Navigate to Drop-off</a>
      <a className={btn} href={phone ? `tel:${phone}` : undefined} aria-disabled={!phone}><Phone className="h-4 w-4" />Call Customer</a>
      <a className={btn} href={phone ? `sms:${phone}` : undefined} aria-disabled={!phone}><MessageSquare className="h-4 w-4" />SMS Customer</a>
      {(job.origin || job.destination) && (
        <p className="col-span-2 text-center text-xs text-muted-foreground">
          iPhone? Open in <a className="underline" href={apple(job.origin)} target="_blank" rel="noreferrer">Apple Maps (pickup)</a> · <a className="underline" href={apple(job.destination)} target="_blank" rel="noreferrer">Apple Maps (drop-off)</a>
        </p>
      )}
    </div>
  );
}

function JobCard({ job, onOpen }: { job: FieldJob; onOpen: () => void }) {
  return (
    <article className="space-y-3 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm">
      <button onClick={onOpen} className="block w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-primary">{hourLabel(job.startHour)}</p>
            <h2 className="text-lg font-semibold">{job.title || job.customerName || `Job #${job.id}`}</h2>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${BADGE[job.fieldStatus]}`}>{job.fieldStatus}</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{job.origin || "No pickup address"} → {job.destination || "No drop-off address"}</p>
      </button>
      <QuickActions job={job} />
      <button onClick={onOpen} className="min-h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground active:scale-[.98]">Open job sheet</button>
    </article>
  );
}

function JobSheet({ job, me, role, onBack, onChange, queue }: { job: FieldJob; me: Me; role: string; onBack: () => void; onChange: (j: FieldJob) => void; queue: (q: Queued) => void }) {
  const [busy, setBusy] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [note, setNote] = useState("");
  const [sig, setSig] = useState<string | null>(null);
  const [pay, setPay] = useState<{ url: string; qr: string; env: string } | null>(null);
  const t = job.timeline ?? {};
  const canStage = OFFICE.includes(role) || ["crew_lead", "driver"].includes(me?.crewRole ?? "");
  const done = Boolean(t.complete);

  useEffect(() => { crmFetch<Photo[]>(`/field/jobs/${job.id}/photos`).then(setPhotos).catch(() => {}); }, [job.id]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (e) { toast.error(e instanceof Error ? e.message : "Something went wrong"); } finally { setBusy(false); }
  };

  const stage = (phase: FieldPhase) => run(async () => {
    const at = new Date().toISOString();
    try { onChange(await post<FieldJob>(`/field/jobs/${job.id}/phase`, { phase, at })); }
    catch (e) {
      if (!isOffline(e)) throw e;
      queue({ jobId: job.id, phase, at });
      const tl = { ...t, [phase]: at };
      const idx = FIELD_PHASES.findIndex(p => p.key === phase);
      onChange({ ...job, timeline: tl, nextPhase: FIELD_PHASES[idx + 1]?.key ?? null });
      toast("Saved on this phone — it will sync when you're back online.");
    }
  });

  const upload = (file?: File) => file && run(async () => {
    const photoData = await shrink(file);
    await post(`/field/jobs/${job.id}/photos`, { photoData, note, phase: t.start_loading ? "post" : "pre" });
    setNote("");
    setPhotos(await crmFetch<Photo[]>(`/field/jobs/${job.id}/photos`));
    toast.success("Photo saved to the job");
  });

  const startCard = () => run(async () => {
    const r = await post<{ url: string; env: string }>(`/field/jobs/${job.id}/checkout`);
    setPay({ ...r, qr: await QRCode.toDataURL(r.url, { margin: 1, width: 260 }) });
  });
  const checkPaid = () => run(async () => {
    const j = await post<FieldJob>(`/field/jobs/${job.id}/checkout-status`);
    onChange(j);
    toast[j.finalPayment ? "success" : "message"](j.finalPayment ? "Card payment received" : "Payment not received yet");
  });

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex min-h-11 items-center gap-1 text-sm font-medium text-primary"><ChevronLeft className="h-4 w-4" />All jobs</button>
      <div className="flex items-start justify-between gap-2">
        <h1 className="text-2xl font-bold text-foreground">{job.title || job.customerName || `Job #${job.id}`}</h1>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${BADGE[job.fieldStatus]}`}>{job.fieldStatus}</span>
      </div>
      <QuickActions job={job} />

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-semibold text-card-foreground">Timecard</h2>
        <ol className="space-y-2">
          {FIELD_PHASES.map(p => (
            <li key={p.key} className="flex items-center justify-between text-sm">
              <span className={t[p.key] ? "text-foreground" : "text-muted-foreground"}>{t[p.key] ? <CheckCircle2 className="mr-2 inline h-4 w-4 text-primary" /> : null}{p.label}</span>
              <span className="tabular-nums text-muted-foreground">{timeOf(t[p.key])}</span>
            </li>
          ))}
        </ol>
        {job.nextPhase && (canStage ? (
          <button disabled={busy} onClick={() => void stage(job.nextPhase!)} className="min-h-14 w-full rounded-xl bg-primary text-lg font-semibold text-primary-foreground disabled:opacity-50 active:scale-[.98]">
            {FIELD_PHASES.find(p => p.key === job.nextPhase)?.label}
          </button>
        ) : <p className="text-sm text-muted-foreground">Your crew lead or driver updates the job stage.</p>)}
        {done && <p className="text-sm text-foreground">Billable time: <strong>{job.bill.hours} h</strong> (pickup arrival to completion)</p>}
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-semibold text-card-foreground">Inspection photos</h2>
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note, e.g. scratch on dresser top" className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground" />
        <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-background font-medium text-foreground">
          <Camera className="h-5 w-5" />{busy ? "Saving…" : "Take or upload photo"}
          <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={busy} onChange={e => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map(p => <figure key={p.id}><img src={p.photoUrl} alt={p.note || "Inspection photo"} className="aspect-square w-full rounded-lg object-cover" /><figcaption className="truncate text-xs text-muted-foreground">{p.note}</figcaption></figure>)}
          </div>
        )}
      </section>

      {done && (
        <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <h2 className="font-semibold text-card-foreground">Final bill</h2>
          <dl className="space-y-1 text-sm">
            {([["Labor", `${job.bill.hours} h`, job.bill.labor], ["Travel fee", "", job.bill.travel], ["Other fees", "", job.bill.fees], ["Deposit paid", "", -job.bill.deposit]] as const).map(([k, extra, v]) => (
              <div key={k} className="flex justify-between text-foreground"><dt>{k} {extra && <span className="text-muted-foreground">({extra})</span>}</dt><dd className="tabular-nums">{money(v)}</dd></div>
            ))}
            <div className="flex justify-between border-t border-border pt-2 text-lg font-bold text-foreground"><dt>Balance due</dt><dd className="tabular-nums">{money(job.bill.due)}</dd></div>
          </dl>

          {job.completedSignature ? (
            <div><p className="text-sm text-muted-foreground">Customer signed off</p><img src={job.completedSignature} alt="Customer signature" className="h-24 rounded-lg border border-border bg-background" /></div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-foreground">Customer: please confirm the work and times above.</p>
              <SignaturePad onChange={setSig} label="Customer signs here" />
              <button disabled={!sig || busy} onClick={() => void run(async () => onChange(await post<FieldJob>(`/field/jobs/${job.id}/signoff`, { signature: sig })))} className="min-h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-50">Save customer sign-off</button>
            </div>
          )}

          {job.finalPayment ? (
            <p className="rounded-xl bg-muted p-3 text-sm font-medium text-foreground">
              Paid {money(job.finalPayment.amountCents / 100)} by {job.finalPayment.method}{job.finalPayment.mode === "test" ? " (test card)" : ""}.
            </p>
          ) : job.bill.due > 0 && (
            <div className="space-y-2">
              {pay ? (
                <div className="space-y-2 text-center">
                  <img src={pay.qr} alt="Scan to pay" className="mx-auto rounded-lg bg-background p-2" />
                  <p className="text-sm text-muted-foreground">Customer scans to pay {money(job.bill.due)}{pay.env === "sandbox" ? " — test mode, use card 4242 4242 4242 4242" : ""}.</p>
                  <a href={pay.url} target="_blank" rel="noreferrer" className="block text-sm text-primary underline">Open payment page on this phone</a>
                  <button disabled={busy} onClick={() => void checkPaid()} className="min-h-12 w-full rounded-xl border border-border font-semibold text-foreground">Check payment</button>
                </div>
              ) : (
                <button disabled={busy} onClick={() => void startCard()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-50"><CreditCard className="h-5 w-5" />Collect by card (QR code)</button>
              )}
              <div className="grid grid-cols-2 gap-2">
                {(["cash", "check"] as const).map(m => (
                  <button key={m} disabled={busy} onClick={() => { if (confirm(`Mark ${money(job.bill.due)} as paid by ${m}?`)) void run(async () => onChange(await post<FieldJob>(`/field/jobs/${job.id}/pay-offline`, { method: m }))); }}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border font-medium text-foreground disabled:opacity-50"><Banknote className="h-4 w-4" />Paid in {m === "cash" ? "Cash" : "Check"}</button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
