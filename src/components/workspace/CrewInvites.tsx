import { useEffect, useState } from "react";
import { Copy, Link2, Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { crmFetch } from "@/lib/crm";

type Invite = {
  id: number;
  token: string;
  email: string;
  crew_role: string;
  accepted_at: string | null;
  expires_at: string;
};
const ROLE_LABEL: Record<string, string> = { driver: "Driver", helper: "Helper", crew_lead: "Crew Lead" };

export default function CrewInvites() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [crewRole, setCrewRole] = useState("helper");
  const [busy, setBusy] = useState(false);
  const link = (token: string) => `${window.location.origin}/join-crew?token=${token}`;

  const load = async () => {
    try {
      setInvites(await crmFetch<Invite[]>("/invites"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load invites");
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    setBusy(true);
    try {
      const inv = await crmFetch<Invite>("/invites", { method: "POST", body: JSON.stringify({ email, crewRole }) });
      await navigator.clipboard?.writeText(link(inv.token)).catch(() => undefined);
      toast.success("Invite link created and copied");
      if (email) {
        const subject = encodeURIComponent("Join our moving crew");
        const text = encodeURIComponent(`You're invited to join the crew as ${ROLE_LABEL[crewRole]}.\n\n${link(inv.token)}`);
        window.location.href = `mailto:${email}?subject=${subject}&body=${text}`;
      }
      setEmail("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create invite");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("Cancel this invite link?")) return;
    await crmFetch(`/invites/${id}`, { method: "DELETE" }).catch(() => undefined);
    await load();
  };

  return (
    <section className="ws-card ws-card-pad" style={{ marginBottom: 16 }}>
      <div className="ws-card-title">
        <div>
          <h2>Invite crew</h2>
          <p>Share a join link, or add an email to open an invite message.</p>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <input
          className="ws-input"
          style={{ flex: "1 1 200px", minWidth: 0 }}
          type="email"
          placeholder="crew@email.com (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <select className="ws-input" style={{ flex: "0 1 140px" }} value={crewRole} onChange={(e) => setCrewRole(e.target.value)}>
          <option value="driver">Driver</option>
          <option value="helper">Helper</option>
          <option value="crew_lead">Crew Lead</option>
        </select>
        <button className="ws-btn primary" disabled={busy} onClick={() => void create()}>
          {email ? <Mail size={15} /> : <Link2 size={15} />} {email ? "Email invite" : "Create link"}
        </button>
      </div>
      {invites.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: "14px 0 0", display: "grid", gap: 8 }}>
          {invites.map((inv) => (
            <li key={inv.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, alignItems: "center" }}>
              <div style={{ minWidth: 0 }}>
                <strong>{ROLE_LABEL[inv.crew_role] ?? inv.crew_role}</strong>
                {inv.email && <span> · {inv.email}</span>}
                <span> · {inv.accepted_at ? "Joined" : new Date(inv.expires_at) < new Date() ? "Expired" : "Pending"}</span>
                <code style={{ display: "block", fontSize: 12, wordBreak: "break-all", overflowWrap: "anywhere" }}>{link(inv.token)}</code>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {!inv.accepted_at && (
                  <button className="ws-btn" aria-label="Copy link" onClick={() => void navigator.clipboard.writeText(link(inv.token)).then(() => toast.success("Copied"))}>
                    <Copy size={14} />
                  </button>
                )}
                <button className="ws-btn" aria-label="Cancel invite" onClick={() => void remove(inv.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
