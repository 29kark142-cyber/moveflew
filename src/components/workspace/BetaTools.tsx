import { useState } from "react";
import { toast } from "sonner";
import { MessageSquareWarning, Sparkles } from "lucide-react";
import { crmFetch } from "@/lib/crm";
import { useI18n } from "@/lib/i18n";
import { Modal } from "./WorkspaceUI";

const post = <T,>(path: string, body: unknown) =>
  crmFetch<T>(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Creates one demo truck, two demo crew and a booked, assigned demo move for today. Admins only. */
export function DemoJobButton({ role, onLoaded, className = "ws-btn primary" }: { role: string; onLoaded: () => void; className?: string }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  if (!["admin", "office_admin"].includes(role)) return null;
  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await post("/demo", { date: localToday() });
          toast.success(t("Demo job loaded for today"));
          onLoaded();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : t("Could not load the demo job"));
        } finally {
          setBusy(false);
        }
      }}
    >
      <Sparkles size={15} /> {busy ? t("Loading…") : t("Load Demo Job")}
    </button>
  );
}

export function FeedbackButton() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"feedback" | "bug">("feedback");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const close = () => { setOpen(false); setMessage(""); setKind("feedback"); };
  return (
    <>
      <button type="button" className="ws-btn ws-feedback-btn" onClick={() => setOpen(true)} aria-label={t("Send Feedback / Report Bug")} title={t("Send Feedback / Report Bug")}>
        <MessageSquareWarning size={15} />
        <span>{t("Send Feedback / Report Bug")}</span>
      </button>
      {open && (
        <Modal title="Send Feedback / Report Bug" onClose={close}>
          <form
            className="ws-feedback-form"
            onSubmit={async e => {
              e.preventDefault();
              if (message.trim().length < 3) return;
              setBusy(true);
              try {
                await post("/feedback", { kind, message, page: window.location.pathname.slice(0, 300) });
                toast.success(t("Thanks! Your message was sent."));
                close();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : t("Could not send feedback"));
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="ws-feedback-kinds" role="radiogroup" aria-label={t("Type")}>
              {(["feedback", "bug"] as const).map(k => (
                <button key={k} type="button" role="radio" aria-checked={kind === k} className={`ws-btn ${kind === k ? "primary" : ""}`} onClick={() => setKind(k)}>
                  {k === "feedback" ? t("Feedback") : t("Bug report")}
                </button>
              ))}
            </div>
            <label htmlFor="ws-feedback-msg">{kind === "bug" ? t("What went wrong? What did you expect?") : t("What should we improve?")}</label>
            <textarea id="ws-feedback-msg" rows={6} maxLength={4000} value={message} onChange={e => setMessage(e.target.value)} required autoFocus />
            <p className="ws-feedback-note">{t("We include the current page so we can find the problem faster.")}</p>
            <div className="ws-feedback-actions">
              <button type="button" className="ws-btn" onClick={close}>{t("Cancel")}</button>
              <button type="submit" className="ws-btn primary" disabled={busy || message.trim().length < 3}>{busy ? t("Sending…") : t("Send")}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
