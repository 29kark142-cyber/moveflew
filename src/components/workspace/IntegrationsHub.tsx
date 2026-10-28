import { useCallback, useEffect, useState } from "react";
import { getWorkspaceId } from "@/lib/crm";
import { createIntegrationKey, listIntegrationKeys, revokeIntegrationKey, type IntegrationKey } from "@/lib/integrations.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, KeyRound, Code2, Webhook, Plus, Ban } from "lucide-react";

const copy = (text: string, what = "Copied") => navigator.clipboard.writeText(text).then(() => toast.success(what), () => toast.error("Copy failed — select and copy manually"));
const when = (d: string | null) => (d ? new Date(d).toLocaleString() : "never");

function Snippet({ text }: { text: string }) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-md border border-border bg-muted p-3 pr-12 text-xs">{text}</pre>
      <Button size="icon" variant="ghost" className="absolute right-1 top-1" onClick={() => copy(text)} aria-label="Copy"><Copy size={14} /></Button>
    </div>
  );
}

export default function IntegrationsHub({ admin }: { admin: boolean }) {
  const workspaceId = Number(getWorkspaceId());
  const [keys, setKeys] = useState<IntegrationKey[]>([]);
  const [busy, setBusy] = useState(false);
  const [labels, setLabels] = useState({ api: "", widget: "", webhook: "" });
  const [revealed, setRevealed] = useState("");
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const load = useCallback(() => {
    if (!admin || !workspaceId) return;
    listIntegrationKeys({ data: { workspaceId } }).then(setKeys).catch(e => toast.error(e.message));
  }, [admin, workspaceId]);
  useEffect(load, [load]);

  if (!admin) return <div className="ws-alert">Only workspace admins can manage website integrations.</div>;

  async function create(kind: IntegrationKey["kind"]) {
    setBusy(true);
    try {
      const { secret } = await createIntegrationKey({ data: { workspaceId, kind, label: labels[kind] } });
      if (kind === "api") setRevealed(secret);
      setLabels(l => ({ ...l, [kind]: "" }));
      toast.success(kind === "api" ? "API key created — copy it now" : kind === "widget" ? "Widget key created" : "Webhook URL created");
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not create"); } finally { setBusy(false); }
  }
  async function revoke(k: IntegrationKey) {
    if (!window.confirm(`Revoke "${k.label || k.keyPrefix}"? Anything using it will stop sending leads.`)) return;
    try { await revokeIntegrationKey({ data: { workspaceId, id: k.id } }); toast.success("Revoked"); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not revoke"); }
  }

  const active = (kind: IntegrationKey["kind"]) => keys.filter(k => k.kind === kind && !k.revokedAt);
  const creator = (kind: IntegrationKey["kind"], placeholder: string, button: string) => (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Input placeholder={placeholder} value={labels[kind]} maxLength={80} onChange={e => setLabels(l => ({ ...l, [kind]: e.target.value }))} />
      <Button disabled={busy} onClick={() => void create(kind)}><Plus size={15} /> {button}</Button>
    </div>
  );
  const meta = (k: IntegrationKey) => <small className="text-muted-foreground">Created {when(k.createdAt)} · last lead {when(k.lastUsedAt)}</small>;
  const revokeBtn = (k: IntegrationKey) => <Button size="sm" variant="outline" onClick={() => void revoke(k)}><Ban size={14} /> Revoke</Button>;

  return (
    <div className="space-y-8 py-4">
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Code2 size={18} /> Embeddable quote widget</h2>
        <p className="text-sm text-muted-foreground">Paste this snippet into WordPress, Wix, Squarespace or Webflow (an "HTML / Embed code" block). Visitors get a quote form, and each submission becomes a new lead in your pipeline.</p>
        {creator("widget", "Website name (e.g. Main website)", "Create widget")}
        {active("widget").map(k => (
          <div key={k.id} className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><b>{k.label || "Website widget"}</b>{revokeBtn(k)}</div>
            <Snippet text={`<script src="${origin}/widget.js" data-workspace-id="${workspaceId}" data-key="${k.publicKey}" async></script>`} />
            {meta(k)}
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Webhook size={18} /> Form builder webhooks</h2>
        <p className="text-sm text-muted-foreground">For Typeform, Jotform and similar tools: add this URL as a webhook. Name, email, phone, addresses and move date are matched from your form's question titles; everything else goes into the lead's notes. Keep the URL private.</p>
        {creator("webhook", "Form name (e.g. Typeform quote form)", "Create webhook URL")}
        {active("webhook").map(k => (
          <div key={k.id} className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><b>{k.label || "Webhook"}</b>{revokeBtn(k)}</div>
            <Snippet text={`${origin}/api/public/v1/hooks/${k.publicKey}`} />
            {meta(k)}
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><KeyRound size={18} /> API keys</h2>
        <p className="text-sm text-muted-foreground">For developers sending leads from their own server. Never put an API key in website code — use the widget for that.</p>
        {creator("api", "Key name (e.g. Custom site backend)", "Generate API key")}
        {revealed && (
          <div className="space-y-2 rounded-lg border border-primary p-3">
            <b>Copy this key now — it won't be shown again.</b>
            <Snippet text={revealed} />
            <Button size="sm" variant="ghost" onClick={() => setRevealed("")}>I've saved it</Button>
          </div>
        )}
        {active("api").map(k => (
          <div key={k.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
            <div className="flex flex-col"><b>{k.label || "API key"}</b><code className="text-xs">{k.keyPrefix}…</code>{meta(k)}</div>
            {revokeBtn(k)}
          </div>
        ))}
        <Snippet text={`curl -X POST ${origin}/api/public/v1/leads \\
  -H "Authorization: Bearer sk_..." \\
  -H "Idempotency-Key: <unique-submission-id>" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Jane Doe","email":"jane@example.com","phone":"555-0100","origin":"123 A St","destination":"456 B Ave","moveDate":"2026-12-01","moveSize":"2 bedroom","message":""}'`} />
      </section>
    </div>
  );
}
